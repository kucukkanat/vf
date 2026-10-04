// NIP-22 comments on profiles, pics, journals, events and threads.
import { query } from '../nostr/pool'
import { publish } from '../nostr/publish'
import { tag, type Event } from '../nostr/util'

export interface Target {
  kind: number
  pubkey: string
  id?: string
  d?: string
}

export const targetOf = (e: Event): Target => ({
  kind: e.kind,
  pubkey: e.pubkey,
  id: e.id,
  d: e.kind >= 30000 && e.kind < 40000 ? (tag(e, 'd') ?? '') : undefined,
})

const isAddr = (t: Target) => t.d !== undefined
export const addrOf = (t: Target) => `${t.kind}:${t.pubkey}:${t.d}`

export function rootTags(t: Target, upper = true): string[][] {
  const [A, E, K, P] = upper ? ['A', 'E', 'K', 'P'] : ['a', 'e', 'k', 'p']
  const out: string[][] = []
  if (isAddr(t)) out.push([A, addrOf(t)])
  else out.push([E, t.id!, '', t.pubkey])
  out.push([K, String(t.kind)], [P, t.pubkey])
  return out
}

export function commentTags(root: Target, parent?: Event): string[][] {
  const tags = rootTags(root, true)
  if (parent && parent.kind === 1111) tags.push(['e', parent.id, '', parent.pubkey], ['k', '1111'], ['p', parent.pubkey])
  else tags.push(...rootTags(root, false))
  return tags
}

export function postComment(root: Target, content: string, parent?: Event, extra: string[][] = []) {
  return publish({ kind: 1111, content: content.slice(0, 5000), tags: [...commentTags(root, parent), ...extra] })
}

export function loadComments(root: Target, limit = 200) {
  const f: any = { kinds: [1111], limit }
  if (isAddr(root)) f['#A'] = [addrOf(root)]
  else f['#E'] = [root.id]
  return query(f)
}

/** Parent id of a comment, or null when it replies to the root directly. */
export function parentId(c: Event): string | null {
  return tag(c, 'k') === '1111' ? (tag(c, 'e') ?? null) : null
}
