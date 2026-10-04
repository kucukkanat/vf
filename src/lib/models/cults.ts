// Cults = NIP-72 moderated communities.
import { APP_TAG } from '../../config'
import { getReplaceable } from '../nostr/cache'
import { query } from '../nostr/pool'
import { publish, updateList } from '../nostr/publish'
import { latestByCoord, safeJson, safeUrl, slugify, tag, tags, tagValues, now, type Event } from '../nostr/util'

export interface Cult {
  owner: string
  d: string
  addr: string
  name: string
  description: string
  image: string
  rules: string
  moderators: string[]
  created_at: number
  event: Event
}

export function parseCult(e: Event): Cult {
  const d = tag(e, 'd') ?? ''
  const mods = tags(e, 'p').filter((t) => t[3] === 'moderator').map((t) => t[1])
  return {
    owner: e.pubkey,
    d,
    addr: `34550:${e.pubkey}:${d}`,
    name: (tag(e, 'name') ?? d).slice(0, 80),
    description: (tag(e, 'description') ?? '').slice(0, 2000),
    image: safeUrl(tag(e, 'image')),
    rules: (tag(e, 'rules') ?? '').slice(0, 2000),
    moderators: [...new Set([e.pubkey, ...mods])],
    created_at: e.created_at,
    event: e,
  }
}

export async function listCults(limit = 200) {
  const evs = await query({ kinds: [34550], '#t': [APP_TAG], limit })
  return latestByCoord(evs).map(parseCult)
}

export async function loadCult(owner: string, d: string) {
  await query({ kinds: [34550], authors: [owner], '#d': [d] })
  const e = getReplaceable(34550, owner, d)
  return e ? parseCult(e) : null
}

export function saveCult(c: { d?: string; name: string; description: string; image?: string; rules?: string; moderators: string[] }) {
  const d = c.d || slugify(c.name)
  const t: string[][] = [['d', d], ['name', c.name], ['description', c.description]]
  if (safeUrl(c.image)) t.push(['image', safeUrl(c.image)])
  if (c.rules) t.push(['rules', c.rules])
  for (const m of c.moderators) t.push(['p', m, '', 'moderator'])
  return publish({ kind: 34550, tags: t })
}

const commTags = (c: Cult, upper: boolean) =>
  upper
    ? [['A', c.addr], ['K', '34550'], ['P', c.owner]]
    : [['a', c.addr], ['k', '34550'], ['p', c.owner]]

export function postToCult(c: Cult, subject: string, content: string) {
  return publish({ kind: 1111, content, tags: [...commTags(c, true), ...commTags(c, false), ['subject', subject.slice(0, 200)]] })
}

export function replyInCult(c: Cult, post: Event, parent: Event, content: string) {
  return publish({
    kind: 1111,
    content,
    tags: [...commTags(c, true), ['e', parent.id, '', parent.pubkey], ['k', String(parent.kind)], ['p', parent.pubkey], ['q', post.id]],
  })
}

export const isTopLevel = (e: Event) => tag(e, 'k') === '34550'

export async function loadCultPosts(c: Cult) {
  const [posts, approvals] = await Promise.all([
    query({ kinds: [1111], '#A': [c.addr], limit: 300 } as any),
    query({ kinds: [4550], '#a': [c.addr], authors: c.moderators, limit: 500 }),
  ])
  const approved = new Set(approvals.map((a) => tag(a, 'e')).filter(Boolean) as string[])
  return { posts, approved }
}

export function isApproved(c: Cult, e: Event, approved: Set<string>) {
  return approved.has(e.id) || c.moderators.includes(e.pubkey)
}

export function approve(c: Cult, post: Event) {
  return publish(
    {
      kind: 4550,
      content: JSON.stringify(post),
      tags: [['a', c.addr], ['e', post.id], ['p', post.pubkey], ['k', String(post.kind)]],
    },
    { appTag: false },
  )
}

/** Replies within a thread: comments whose parent chain leads to the post. */
export function threadReplies(all: Event[], post: Event) {
  const ids = new Set([post.id])
  const out: Event[] = []
  const sorted = [...all].sort((a, b) => a.created_at - b.created_at)
  for (const e of sorted) {
    if (isTopLevel(e)) continue
    const parent = tag(e, 'e')
    if ((parent && ids.has(parent)) || tag(e, 'q') === post.id) {
      ids.add(e.id)
      out.push(e)
    }
  }
  return out
}

// membership via NIP-51 kind 10004
export async function myCults(me: string) {
  await query({ kinds: [10004], authors: [me] })
  const e = getReplaceable(10004, me)
  return e ? tagValues(e, 'a') : []
}

export function joinCult(me: string, c: Cult, on: boolean) {
  return updateList(10004, me, (t) => {
    const rest = t.filter((x) => !(x[0] === 'a' && x[1] === c.addr))
    return on ? [...rest, ['a', c.addr]] : rest
  })
}

export async function cultMembers(c: Cult) {
  const evs = await query({ kinds: [10004], '#a': [c.addr], limit: 1000 })
  return [...new Set(latestByCoord(evs).filter((e) => tagValues(e, 'a').includes(c.addr)).map((e) => e.pubkey))]
}

export const approvalPost = (a: Event): Event | null => safeJson<Event | null>(a.content, null)
export { now }
