// NIP-23 long-form journals. Admin journals tagged `vf-news` are site news.
import { APP_TAG } from '../../config'
import { getReplaceable } from '../nostr/cache'
import { query } from '../nostr/pool'
import { publish } from '../nostr/publish'
import { latestByCoord, now, safeUrl, slugify, tag, tagValues, type Event } from '../nostr/util'

export const NEWS_TAG = 'vf-news'

export interface Journal {
  id: string
  pubkey: string
  d: string
  title: string
  summary: string
  image: string
  body: string
  mood: string
  music: string
  topics: string[]
  published: number
  updated: number
  nsfw: string | null
  event: Event
}

export function parseJournal(e: Event): Journal {
  const cw = e.tags.find((t) => t[0] === 'content-warning')
  return {
    id: e.id,
    pubkey: e.pubkey,
    d: tag(e, 'd') ?? '',
    title: (tag(e, 'title') ?? 'Untitled').slice(0, 200),
    summary: (tag(e, 'summary') ?? '').slice(0, 500),
    image: safeUrl(tag(e, 'image')),
    body: e.content.slice(0, 100_000),
    mood: (tag(e, 'mood') ?? '').slice(0, 60),
    music: (tag(e, 'music') ?? '').slice(0, 120),
    topics: tagValues(e, 't').filter((t) => t !== APP_TAG && t !== NEWS_TAG),
    published: Number(tag(e, 'published_at')) || e.created_at,
    updated: e.created_at,
    nsfw: cw ? cw[1] || 'NSFW' : null,
    event: e,
  }
}

export async function loadJournals(opts: { authors?: string[]; news?: boolean; limit?: number } = {}) {
  const f: any = { kinds: [30023], limit: opts.limit ?? 50, '#t': [opts.news ? NEWS_TAG : APP_TAG] }
  if (opts.authors) f.authors = opts.authors
  const evs = await query(f)
  return latestByCoord(evs).map(parseJournal).sort((a, b) => b.published - a.published)
}

export async function loadJournal(pubkey: string, d: string) {
  await query({ kinds: [30023], authors: [pubkey], '#d': [d] })
  const e = getReplaceable(30023, pubkey, d)
  return e ? parseJournal(e) : null
}

export function saveJournal(j: {
  d?: string
  title: string
  body: string
  summary?: string
  image?: string
  mood?: string
  music?: string
  topics?: string[]
  nsfw?: string | null
  news?: boolean
  published?: number
}) {
  const d = j.d || slugify(j.title) + '-' + now().toString(36)
  const t: string[][] = [
    ['d', d],
    ['title', j.title.slice(0, 200)],
    ['published_at', String(j.published ?? now())],
  ]
  if (j.summary) t.push(['summary', j.summary])
  if (safeUrl(j.image)) t.push(['image', safeUrl(j.image)])
  if (j.mood) t.push(['mood', j.mood])
  if (j.music) t.push(['music', j.music])
  for (const topic of j.topics ?? []) t.push(['t', topic.toLowerCase()])
  if (j.news) t.push(['t', NEWS_TAG])
  if (j.nsfw != null) t.push(['content-warning', j.nsfw])
  return publish({ kind: 30023, content: j.body, tags: t })
}
