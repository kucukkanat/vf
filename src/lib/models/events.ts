// NIP-52 calendar events (kind 31923) + RSVPs (kind 31925).
import { APP_TAG } from '../../config'
import { getReplaceable } from '../nostr/cache'
import { query } from '../nostr/pool'
import { publish } from '../nostr/publish'
import { latestByCoord, safeUrl, slugify, tag, now, type Event } from '../nostr/util'

export interface CalEvent {
  pubkey: string
  d: string
  addr: string
  title: string
  summary: string
  description: string
  image: string
  location: string
  start: number
  end: number
  event: Event
}

export function parseCal(e: Event): CalEvent | null {
  const start = Number(tag(e, 'start'))
  if (!start) return null
  const d = tag(e, 'd') ?? ''
  return {
    pubkey: e.pubkey,
    d,
    addr: `31923:${e.pubkey}:${d}`,
    title: (tag(e, 'title') ?? tag(e, 'name') ?? 'Untitled event').slice(0, 200),
    summary: (tag(e, 'summary') ?? '').slice(0, 500),
    description: e.content.slice(0, 10000),
    image: safeUrl(tag(e, 'image')),
    location: (tag(e, 'location') ?? '').slice(0, 200),
    start,
    end: Number(tag(e, 'end')) || start,
    event: e,
  }
}

export async function loadEvents(limit = 200) {
  const evs = await query({ kinds: [31923], '#t': [APP_TAG], limit })
  return latestByCoord(evs)
    .map(parseCal)
    .filter((x): x is CalEvent => !!x)
    .sort((a, b) => a.start - b.start)
}

export async function loadEvent(pubkey: string, d: string) {
  await query({ kinds: [31923], authors: [pubkey], '#d': [d] })
  const e = getReplaceable(31923, pubkey, d)
  return e ? parseCal(e) : null
}

export function saveEvent(c: { d?: string; title: string; summary: string; description: string; image?: string; location: string; start: number; end: number }) {
  const d = c.d || slugify(c.title) + '-' + now().toString(36)
  const t: string[][] = [
    ['d', d],
    ['title', c.title],
    ['start', String(c.start)],
    ['end', String(Math.max(c.end, c.start))],
    ['location', c.location],
  ]
  if (c.summary) t.push(['summary', c.summary])
  if (safeUrl(c.image)) t.push(['image', safeUrl(c.image)])
  try {
    t.push(['start_tzid', Intl.DateTimeFormat().resolvedOptions().timeZone])
  } catch {}
  return publish({ kind: 31923, content: c.description, tags: t })
}

export type RSVP = 'accepted' | 'tentative' | 'declined'

export function rsvp(ev: CalEvent, status: RSVP) {
  return publish({
    kind: 31925,
    tags: [['d', 'rsvp-' + ev.addr], ['a', ev.addr], ['status', status], ['p', ev.pubkey]],
  })
}

export async function loadRsvps(ev: CalEvent) {
  const evs = await query({ kinds: [31925], '#a': [ev.addr], limit: 1000 })
  const out: Record<string, RSVP> = {}
  for (const e of latestByCoord(evs)) {
    const s = tag(e, 'status') as RSVP
    if (s === 'accepted' || s === 'tentative' || s === 'declined') out[e.pubkey] = s
  }
  return out
}
