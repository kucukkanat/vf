// NIP-68 picture events + 1-10 ratings (kind 7).
import { APP_TAG } from '../../config'
import { query } from '../nostr/pool'
import { publish } from '../nostr/publish'
import { safeUrl, tag, tags, type Event } from '../nostr/util'
import type { Blob } from '../media/blossom'

export interface Pic {
  id: string
  pubkey: string
  title: string
  desc: string
  url: string
  fallbacks: string[]
  nsfw: string | null
  created_at: number
  event: Event
}

export function parsePic(e: Event): Pic | null {
  let url = ''
  const fallbacks: string[] = []
  for (const im of tags(e, 'imeta')) {
    for (const part of im.slice(1)) {
      const [k, ...v] = part.split(' ')
      const val = v.join(' ')
      if (k === 'url' && !url) url = safeUrl(val)
      if (k === 'fallback' && safeUrl(val)) fallbacks.push(safeUrl(val))
    }
    if (url) break
  }
  if (!url) url = safeUrl(tag(e, 'url'))
  if (!url) return null
  const cw = e.tags.find((t) => t[0] === 'content-warning')
  return {
    id: e.id,
    pubkey: e.pubkey,
    title: (tag(e, 'title') ?? '').slice(0, 120),
    desc: e.content.slice(0, 2000),
    url,
    fallbacks,
    nsfw: cw ? cw[1] || 'NSFW' : null,
    created_at: e.created_at,
    event: e,
  }
}

export async function loadPics(opts: { authors?: string[]; ids?: string[]; since?: number; limit?: number } = {}) {
  const f: any = { kinds: [20], limit: opts.limit ?? 100 }
  if (opts.ids) f.ids = opts.ids
  else f['#t'] = [APP_TAG]
  if (opts.authors) f.authors = opts.authors
  if (opts.since) f.since = opts.since
  const evs = await query(f)
  return evs.map(parsePic).filter((p): p is Pic => !!p)
}

export async function postPic(
  blob: Blob,
  title: string,
  desc: string,
  nsfw: string | null,
  dim?: { w: number; h: number } | null,
) {
  const imeta = ['imeta', `url ${blob.url}`, `m ${blob.type}`, `x ${blob.sha256}`, `size ${blob.size}`]
  if (dim) imeta.push(`dim ${dim.w}x${dim.h}`)
  if (title) imeta.push(`alt ${title}`)
  for (const m of blob.mirrors) imeta.push(`fallback ${m}`)
  const t: string[][] = [['title', title], imeta, ['x', blob.sha256], ['m', blob.type]]
  if (nsfw !== null) t.push(['content-warning', nsfw], ['L', 'content-warning'], ['l', 'nsfw', 'content-warning'])
  return publish({ kind: 20, content: desc, tags: t })
}

// ---- ratings ----

export function parseRating(e: Event): number | null {
  const n = Number(e.content.trim())
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null
}

export function rate(pic: Pic, n: number) {
  if (!(n >= 1 && n <= 10)) throw new Error('Rating must be 1-10')
  return publish({ kind: 7, content: String(n), tags: [['e', pic.id, '', pic.pubkey], ['p', pic.pubkey], ['k', '20']] })
}

export function loadRatings(picIds: string[]) {
  if (!picIds.length) return Promise.resolve([] as Event[])
  return query({ kinds: [7], '#e': picIds, limit: 5000 })
}

export interface Score {
  avg: number
  count: number
  mine: number | null
}

/** Averages the newest rating per voter per pic, counting only eligible voters (and self-votes never). */
export function aggregate(events: Event[], eligible: (pk: string) => boolean, me: string | null, owners: Record<string, string> = {}) {
  const latest = new Map<string, Event>()
  for (const e of events) {
    const pic = tag(e, 'e')
    if (!pic || parseRating(e) === null) continue
    const k = pic + ':' + e.pubkey
    const prev = latest.get(k)
    if (!prev || prev.created_at < e.created_at) latest.set(k, e)
  }
  const out: Record<string, Score> = {}
  for (const e of latest.values()) {
    const pic = tag(e, 'e')!
    const n = parseRating(e)!
    const s = (out[pic] ??= { avg: 0, count: 0, mine: null })
    if (e.pubkey === me) s.mine = n
    if (owners[pic] === e.pubkey || !eligible(e.pubkey)) continue
    s.avg = (s.avg * s.count + n) / (s.count + 1)
    s.count++
  }
  return out
}
