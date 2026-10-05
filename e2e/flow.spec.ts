import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { deflateSync } from 'node:zlib'

const SHOTS = process.env.SHOTS_DIR

// Minimal valid PNG (solid colour) so uploads have a real image.
function png(w: number, h: number, rgb: [number, number, number]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (b: Buffer) => {
    let c = 0xffffffff
    for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const rows = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rows.set(rgb, y * (w * 3 + 1) + 1 + x * 3)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))])
}

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

async function join(ctx: BrowserContext, name: string, year = '1990') {
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message))
  await page.goto('./')
  await page.getByPlaceholder('e.g. 1991').fill(year)
  await page.getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('link', { name: 'ASSIMILATE' }).click()
  await page.getByRole('button', { name: 'Create my key' }).click()
  const words = (await page.locator('.words div').allInnerTexts()).map((t) => t.replace(/^\d+\.\s*/, '').trim())
  expect(words).toHaveLength(12)
  if (name === 'Raven') await shot(page, '02-backup-words')
  await page.getByLabel('I wrote down all 12 words').check()
  await page.getByRole('button', { name: 'Next' }).click()
  for (const label of await page.locator('form label').allInnerTexts()) {
    const n = Number(label.match(/#(\d+)/)![1])
    await page.getByLabel(label, { exact: true }).fill(words[n - 1])
  }
  await page.getByRole('button', { name: 'Confirm' }).click()
  await page.getByLabel('Password (8+ characters)').fill('correct horse battery')
  await page.getByLabel('Repeat password').fill('correct horse battery')
  await page.getByRole('button', { name: 'Save & continue' }).click()
  await expect(page.getByText('Account created!')).toBeVisible({ timeout: 30_000 })
  await page.getByLabel('Display name').fill(name)
  await page.getByLabel('Headline').fill(`${name} haunts the night`)
  await page.getByLabel('Location').fill('Gotham')
  await page.getByLabel('goth', { exact: true }).check()
  await page.getByRole('button', { name: 'Enter the crypt' }).click()
  await expect(page.locator('iframe.layout-frame')).toBeVisible()
  const npub = decodeURIComponent(page.url()).match(/npub1[0-9a-z]+/)![0]
  return { page, words, npub }
}

test('full member journey', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1100, height: 900 } })
  const ctxB = await browser.newContext({ viewport: { width: 1100, height: 900 } })

  // --- age gate screenshot
  const gate = await ctxA.newPage()
  await gate.goto('./')
  await shot(gate, '01-age-gate')
  await gate.close()

  const A = await join(ctxA, 'Raven')
  const a = A.page
  await expect(a.frameLocator('iframe.layout-frame').getByText('Raven haunts the night')).toBeVisible()

  // --- upload a pic
  await a.goto('./#/upload')
  await a.locator('input[type=file]').setInputFiles({ name: 'bat.png', mimeType: 'image/png', buffer: png(64, 64, [200, 0, 40]) })
  await a.getByLabel('Title').fill('Midnight selfie')
  await a.getByRole('button', { name: 'Upload' }).click()
  await expect(a.getByText('Midnight selfie')).toBeVisible({ timeout: 20_000 })
  const picUrl = a.url()

  // --- journal
  await a.goto('./#/journal/new')
  await a.getByLabel('Title').fill('My first entry')
  await a.getByLabel('Current mood').fill('gloomy')
  await a.getByPlaceholder(/Pour your heart out/).fill('The **moon** is out tonight.')
  await a.getByRole('button', { name: 'Publish' }).click()
  await expect(a.locator('.prose strong')).toHaveText('moon')

  // --- custom layout
  await a.goto('./#/edit/layout')
  await a.getByLabel('Toxic Cybergoth').check()
  await a.getByRole('button', { name: 'Save layout' }).click()
  await expect(a.getByText('Layout saved!')).toBeVisible()

  // --- profile song via upload
  await a.goto('./#/edit')
  await a.getByLabel('Song title').fill('Raven - Night Theme')
  await a.locator('input[type=file][accept^="audio"]').setInputFiles({ name: 'song.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('ID3fake-mp3-data') })
  await expect(a.locator('.player audio')).toHaveCount(1, { timeout: 15_000 })
  await a.getByLabel('About me').fill('I like bats, black lace and Bauhaus.')
  await a.getByRole('button', { name: 'Save profile' }).click()
  await expect(a.locator('.player')).toBeVisible()
  await expect(a.frameLocator('iframe.layout-frame').getByText('I like bats')).toBeVisible({ timeout: 10_000 })

  // --- cult
  await a.goto('./#/cult/new')
  await a.getByLabel('Cult name').fill('Children of the Night')
  await a.getByLabel('Description').fill('For creatures who sleep all day.')
  await a.getByRole('button', { name: 'Save' }).click()
  await expect(a.locator('.box-h').getByText('Children of the Night')).toBeVisible()
  const cultUrl = a.url()
  await a.getByPlaceholder('Subject').fill('Introduce yourself')
  await a.getByPlaceholder('Message').fill('Hail, freaks.')
  await a.getByRole('button', { name: 'Post', exact: true }).click()
  await expect(a.getByRole('link', { name: 'Introduce yourself' })).toBeVisible()

  // --- forum
  await a.goto('./#/forums/music')
  await a.getByRole('button', { name: '+ New thread' }).click()
  await a.getByPlaceholder('Thread title').fill('Best EBM of 2009?')
  await a.getByPlaceholder('Message').fill('Go!')
  await a.getByRole('button', { name: 'Post thread' }).click()
  await expect(a.locator('.box-h').getByText('Best EBM of 2009?')).toBeVisible()

  // --- event
  await a.goto('./#/event/new')
  await a.getByLabel('Title').fill('Bat Cave Night')
  await a.getByLabel('Starts').fill('2030-10-31T22:00')
  await a.getByLabel('Location').fill('The Crypt')
  await a.getByRole('button', { name: 'Save event' }).click()
  await expect(a.locator('.box-h').getByText('Bat Cave Night')).toBeVisible()

  // --- second member interacts
  const B = await join(ctxB, 'Lilith')
  const b = B.page
  await b.goto(`./#/u/${A.npub}`)
  await b.getByRole('button', { name: '+ Add friend' }).click()
  await expect(b.getByText(/Friend request sent/)).toBeVisible()
  await b.getByPlaceholder(/Say something to Raven/).fill('love your layout <3')
  await b.getByRole('button', { name: 'Post comment' }).click()
  await expect(b.locator('.comment').getByText('love your layout <3')).toBeVisible()

  await b.goto(picUrl)
  await b.locator('.rate button', { hasText: /^9$/ }).click()
  await expect(b.locator('.rate button.mine')).toHaveText('9')
  await b.getByPlaceholder('Leave a comment…').fill('stunning')
  await b.getByRole('button', { name: 'Post comment' }).click()
  await expect(b.locator('.comment').getByText('stunning')).toBeVisible()

  await b.goto(`./#/inbox/${A.npub}`)
  await b.getByPlaceholder('Type a message…').fill('hey raven!')
  await b.getByRole('button', { name: 'Send' }).click()
  await expect(b.locator('.msg.me')).toHaveText(/hey raven!/)

  await b.goto(cultUrl)
  await b.getByRole('button', { name: 'Join cult' }).click()
  await expect(b.getByRole('button', { name: 'Leave cult' })).toBeVisible()

  // --- A accepts friend request, sees comment and message
  await a.goto('./#/friends')
  await expect(a.getByText('Friend requests (1)')).toBeVisible({ timeout: 15_000 })
  await a.getByRole('button', { name: 'Accept' }).click()
  await expect(a.locator('.ugrid').getByText('Lilith')).toBeVisible()
  await a.getByRole('button', { name: '+ top 8' }).click()
  await a.getByRole('button', { name: 'Save Top 8' }).click()
  await expect(a.getByText('Top 8 saved!')).toBeVisible()

  await a.goto(`./#/u/${A.npub}`)
  await expect(a.locator('.comment').getByText('love your layout <3')).toBeVisible()
  await expect(a.frameLocator('iframe.layout-frame').locator('.vf-top8').getByText('Lilith')).toBeVisible()
  await expect(a.frameLocator('iframe.layout-frame').locator('.vf-pics img')).toHaveCount(1)
  await a.waitForTimeout(800)
  await shot(a, '03-profile-custom-layout')
  await a.setViewportSize({ width: 390, height: 844 })
  await a.waitForTimeout(800)
  await shot(a, '07-profile-mobile')
  await a.setViewportSize({ width: 1100, height: 900 })

  await a.goto(`./#/inbox/${B.npub}`)
  await expect(a.locator('.msg').getByText('hey raven!')).toBeVisible({ timeout: 15_000 })
  await a.getByPlaceholder('Type a message…').fill('welcome, Lilith')
  await a.getByRole('button', { name: 'Send' }).click()
  await b.goto(`./#/inbox/${A.npub}`)
  await expect(b.locator('.msg').getByText('welcome, Lilith')).toBeVisible({ timeout: 15_000 })
  await shot(a, '06-inbox')

  await a.goto(picUrl)
  await expect(a.getByText(/9\.00/)).toBeVisible({ timeout: 10_000 })
  await shot(a, '04-pic-rating')

  await a.goto('./')
  await expect(a.locator('.ucard').getByText('Lilith').first()).toBeVisible()
  await shot(a, '05-home')

  // --- backup phrase reveal + restore on a fresh device
  await a.goto('./#/settings')
  await a.getByPlaceholder('Password', { exact: true }).fill('correct horse battery')
  await a.getByRole('button', { name: 'Show my 12 words' }).click()
  await expect(a.locator('.words div')).toHaveCount(12, { timeout: 20_000 })
  const shown = (await a.locator('.words div').allInnerTexts()).map((t) => t.replace(/^\d+\.\s*/, '').trim())
  expect(shown).toEqual(A.words)

  const ctxC = await browser.newContext()
  const c = await ctxC.newPage()
  await c.goto('./')
  await c.getByPlaceholder('e.g. 1991').fill('1990')
  await c.getByRole('button', { name: 'Enter' }).click()
  await c.goto('./#/login')
  await c.getByLabel('Your 12-word backup phrase').fill(A.words.join(' '))
  await c.getByLabel('New password for this device').fill('another password')
  await c.getByLabel('Repeat password').fill('another password')
  await c.getByRole('button', { name: 'Restore account' }).click()
  await expect(c.locator('.userbar').getByText('Raven')).toBeVisible({ timeout: 30_000 })

  // reload => locked, unlock with password
  await c.evaluate(() => sessionStorage.clear())
  await c.goto('./#/')
  await c.reload()
  await c.getByPlaceholder('Your password').fill('another password')
  await c.getByRole('button', { name: 'Unlock' }).click()
  await expect(c.locator('.userbar').getByText('Raven')).toBeVisible()
})

test('minor: NSFW hidden and strangers cannot DM', async ({ browser }) => {
  const adult = await join(await browser.newContext(), 'Eşek Sıpası')
  await adult.page.goto('./#/upload')
  await adult.page.locator('input[type=file]').setInputFiles({ name: 'x.png', mimeType: 'image/png', buffer: png(32, 32, [10, 10, 10]) })
  await adult.page.getByLabel('Title').fill('spicy')
  await adult.page.getByLabel(/NSFW/).check()
  await adult.page.getByRole('button', { name: 'Upload' }).click()
  await expect(adult.page.locator('.box-h').getByText('spicy')).toBeVisible({ timeout: 20_000 })
  const picUrl = adult.page.url()

  const teen = await join(await browser.newContext(), 'Teen', String(new Date().getFullYear() - 15))
  await teen.page.goto(picUrl)
  await expect(teen.page.getByText('only available to members 18 and older')).toBeVisible()
  await expect(teen.page.locator('img.bigpic')).toHaveCount(0)
  await teen.page.goto(`./#/inbox/${adult.npub}`)
  await expect(teen.page.getByText('You can only message mutual friends')).toBeVisible()

  // member search ignores accents, dotless i, case and spaces
  await teen.page.goto('./#/members')
  await teen.page.getByPlaceholder('Name, bands, headline…').fill('eseksipasi')
  await expect(teen.page.locator('.ucard').getByText('Eşek Sıpası')).toBeVisible({ timeout: 15_000 })
})
