// Friends (mutual follows), friend requests, Top 8.
import { D } from '../../config'
import { getReplaceable } from '../nostr/cache'
import { query } from '../nostr/pool'
import { publish, updateList } from '../nostr/publish'
import { tagValues, uniq } from '../nostr/util'

export const social = $state({ follows: [] as string[], loaded: false })

export async function loadMyFollows(me: string) {
  const evs = await query({ kinds: [3], authors: [me] })
  social.follows = evs[0] ? uniq(tagValues(evs[0], 'p')) : []
  social.loaded = true
}

export async function follow(me: string, target: string, on: boolean) {
  const ev = await updateList(3, me, (tags) => {
    const rest = tags.filter((t) => !(t[0] === 'p' && t[1] === target))
    return on ? [...rest, ['p', target]] : rest
  })
  social.follows = uniq(tagValues(ev, 'p'))
}

export async function followsOf(pk: string): Promise<string[]> {
  const evs = await query({ kinds: [3], authors: [pk] })
  return evs[0] ? uniq(tagValues(evs[0], 'p')) : []
}

export async function followersOf(pk: string, limit = 1000): Promise<string[]> {
  const evs = await query({ kinds: [3], '#p': [pk], limit }, { maxWait: 5000 })
  // only count authors whose latest contact list still includes pk
  const latest = new Map<string, (typeof evs)[number]>()
  for (const e of evs) if (!latest.has(e.pubkey) || latest.get(e.pubkey)!.created_at < e.created_at) latest.set(e.pubkey, e)
  return [...latest.values()].filter((e) => tagValues(e, 'p').includes(pk)).map((e) => e.pubkey)
}

/** Mutual follows of pk, plus one-way followers (friend requests when pk = me). */
export async function friendsOf(pk: string) {
  const [following, followers] = await Promise.all([followsOf(pk), followersOf(pk)])
  const fset = new Set(following)
  return {
    friends: followers.filter((p) => fset.has(p)),
    requests: followers.filter((p) => !fset.has(p)),
    following,
  }
}

export async function loadTop8(pk: string): Promise<string[]> {
  await query({ kinds: [30000], authors: [pk], '#d': [D.top8] })
  const e = getReplaceable(30000, pk, D.top8)
  return e ? tagValues(e, 'p').slice(0, 8) : []
}

export function saveTop8(list: string[]) {
  return publish({
    kind: 30000,
    tags: [['d', D.top8], ['title', 'Top 8'], ...list.slice(0, 8).map((p) => ['p', p])],
  })
}

export async function addToTop8(me: string, pk: string) {
  return updateList(
    30000,
    me,
    (tags) => {
      const ps = tags.filter((t) => t[0] === 'p').map((t) => t[1])
      if (ps.includes(pk) || ps.length >= 8) return tags
      return [...tags, ['p', pk]]
    },
    { d: D.top8, appTag: true },
  )
}
