// Global forum boards: NIP-7D threads (kind 11) + NIP-22 replies (kind 1111).
import { query } from '../nostr/pool'
import { publish } from '../nostr/publish'
import { tag, type Event } from '../nostr/util'
import { postComment, targetOf } from './comments'

export const boardTag = (id: string) => `vf-board-${id}`

export function loadThreads(board: string, limit = 100) {
  return query({ kinds: [11], '#t': [boardTag(board)], limit })
}

export async function loadThread(id: string) {
  const [t] = await query({ ids: [id] })
  return t ?? null
}

export function newThread(board: string, title: string, content: string) {
  return publish({ kind: 11, content, tags: [['title', title.slice(0, 200)], ['t', boardTag(board)]] })
}

export function replyToThread(thread: Event, content: string, parent?: Event) {
  return postComment(targetOf(thread), content, parent)
}

export async function replyStats(threadIds: string[]) {
  if (!threadIds.length) return {}
  const evs = await query({ kinds: [1111], '#E': threadIds, limit: 2000 } as any)
  const stats: Record<string, { count: number; last: number; lastBy: string }> = {}
  for (const e of evs) {
    const root = tag(e, 'E')
    if (!root) continue
    const s = (stats[root] ??= { count: 0, last: 0, lastBy: '' })
    s.count++
    if (e.created_at > s.last) {
      s.last = e.created_at
      s.lastBy = e.pubkey
    }
  }
  return stats
}

export const threadTitle = (e: Event) => (tag(e, 'title') ?? e.content.slice(0, 60)).slice(0, 200)
