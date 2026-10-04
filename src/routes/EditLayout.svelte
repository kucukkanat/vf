<script lang="ts">
  import LayoutFrame from '../components/LayoutFrame.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { loadLayout, saveLayout, MAX_LAYOUT } from '../lib/models/layout'
  import { metas, vfs, refreshProfile } from '../lib/models/profiles.svelte'
  import { buildProfileHtml } from '../lib/profileHtml'
  import { THEMES } from '../lib/themes'
  import { href, route } from '../lib/router.svelte'
  import { npub, toHex } from '../lib/nostr/util'

  const pk = session.pubkey
  let css = $state('')
  let html = $state('')
  let theme = $state('classic')
  let msg = $state('')
  let busy = $state(false)
  let copyFrom = $state(route.query.get('copy') ?? '')

  async function init() {
    if (!pk) return
    refreshProfile(pk)
    const l = await loadLayout(pk)
    if (l) ((css = l.css), (html = l.html), (theme = l.theme || 'classic'))
    if (copyFrom) await copy()
  }
  init()

  function applyTheme(id: string) {
    const t = THEMES.find((x) => x.id === id)
    if (!t) return
    if ((css || html) && !confirm('Replace your current CSS/HTML with this theme?')) return
    theme = id
    css = t.css
    html = t.html ?? ''
  }
  async function copy() {
    const other = toHex(copyFrom)
    if (!other) return (msg = 'Enter a valid npub')
    const l = await loadLayout(other)
    if (!l) return (msg = 'That user has no custom layout')
    css = l.css
    html = l.html
    msg = 'Layout copied. Remember to give credit!'
  }
  async function save() {
    busy = true
    msg = ''
    try {
      await saveLayout({ css, html, theme })
      msg = 'Layout saved!'
    } catch (e: any) {
      msg = 'Error: ' + e.message
    } finally {
      busy = false
    }
  }

  let preview = $state('')
  let t: ReturnType<typeof setTimeout>
  $effect(() => {
    if (!pk) return
    const doc = { pubkey: pk, meta: metas[pk], vf: vfs[pk], top8: [], friendCount: 0, pics: [], journals: [], online: true, canSeeNsfw: false }
    const custom = { css, html }
    clearTimeout(t)
    t = setTimeout(() => (preview = buildProfileHtml(doc, custom)), 350)
  })
</script>

{#if !pk}
  <p><a href={href('/login')}>Log in</a> first.</p>
{:else}
  <div class="cols">
    <div>
      <div class="box"><div class="box-h"><span>Themes</span></div><div class="box-b">
        {#each THEMES as th}
          <div><label class="inline"><input type="radio" name="theme" checked={theme === th.id} onchange={() => applyTheme(th.id)} /> {th.name}</label></div>
        {/each}
      </div></div>
      <div class="box"><div class="box-h"><span>Copy a layout</span></div><div class="box-b">
        <input bind:value={copyFrom} placeholder="npub of a freak" />
        <button class="small alt" style="margin-top:4px" onclick={copy}>Copy</button>
      </div></div>
      <div class="box"><div class="box-h"><span>Cheat sheet</span></div><div class="box-b small">
        <p>Style these selectors:</p>
        <code>body, #vf-profile, .vf-box, .vf-box&gt;h3, .vf-in, .vf-avatar, .vf-name, .vf-headline, .vf-details, .vf-about, .vf-custom, .vf-top8, .vf-friend, .vf-pics, .vf-journals, .vf-bands, .vf-tag, .vf-banner</code>
        <p>HTML goes in your custom box under "About me". No scripts, forms or iframes. Images, marquees and tables are fine.</p>
      </div></div>
    </div>
    <div>
      <div class="box"><div class="box-h"><span>Custom CSS</span><span class="small">{css.length}/{MAX_LAYOUT}</span></div><div class="box-b">
        <textarea bind:value={css} rows="12" spellcheck="false" style="font-family:'Courier New',monospace" placeholder="body {'{'} background: url(https://…/bats.gif) {'}'}"></textarea>
      </div></div>
      <div class="box"><div class="box-h"><span>Custom HTML</span><span class="small">{html.length}/{MAX_LAYOUT}</span></div><div class="box-b">
        <textarea bind:value={html} rows="6" spellcheck="false" style="font-family:'Courier New',monospace" placeholder={'<div class="vf-box"><h3>My stuff</h3><div class="vf-in">...</div></div>'}></textarea>
      </div></div>
      <div class="row" style="margin-bottom:10px">
        <button onclick={save} disabled={busy || css.length > MAX_LAYOUT || html.length > MAX_LAYOUT}>{busy ? 'Saving…' : 'Save layout'}</button>
        <a class="btn alt" href={href('/u/' + npub(pk))}>View profile</a>
        {#if msg}<span class={msg.startsWith('Error') ? 'err' : 'ok'}>{msg}</span>{/if}
      </div>
      <div class="box"><div class="box-h"><span>Live preview</span></div><div class="box-b">{#if preview}<LayoutFrame srcdoc={preview} />{/if}</div></div>
    </div>
  </div>
{/if}
