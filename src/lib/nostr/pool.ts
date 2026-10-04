import { SimplePool } from 'nostr-tools/pool'
import type { Filter } from 'nostr-tools/filter'
import { DEFAULT_RELAYS, SEARCH_RELAYS } from '../../config'
import { put } from './cache'
import { uniq, type Event } from './util'

export const pool = new SimplePool({ enablePing: true, enableReconnect: true })

/** User's own NIP-65 write relays (set after login). */
let userRelays: string[] = []
export function setUserRelays(r: string[]) {
  userRelays = r.filter((u) => /^wss?:\/\//.test(u)).slice(0, 5)
}

export const normalizeRelay = (u: string) => u.trim().replace(/\/+$/, '')

export function readRelays(extra: string[] = []) {
  return uniq([...DEFAULT_RELAYS, ...extra, ...userRelays].map(normalizeRelay))
}
export function writeRelays(extra: string[] = []) {
  return uniq([...DEFAULT_RELAYS, ...userRelays, ...extra].map(normalizeRelay))
}

export interface QueryOpts {
  relays?: string[]
  maxWait?: number
}

/** One-shot query across relays (resolves on EOSE from all or after maxWait). */
export async function query(filter: Filter, opts: QueryOpts = {}): Promise<Event[]> {
  const relays = opts.relays ?? readRelays()
  const seen = new Map<string, Event>()
  await new Promise<void>((resolve) => {
    const sub = pool.subscribeManyEose(relays, filter, {
      maxWait: opts.maxWait ?? 4500,
      onevent(e) {
        seen.set(e.id, e)
        put(e)
      },
      onclose() {
        resolve()
      },
    })
    // safety net in case onclose is never called
    setTimeout(() => {
      sub.close()
      resolve()
    }, (opts.maxWait ?? 4500) + 1500)
  })
  return [...seen.values()].sort((a, b) => b.created_at - a.created_at)
}

/** Live subscription. Returns a function that closes it. */
export function live(
  filter: Filter,
  onevent: (e: Event) => void,
  opts: { relays?: string[]; oneose?: () => void } = {},
) {
  const seen = new Set<string>()
  const sub = pool.subscribeMany(opts.relays ?? readRelays(), filter, {
    onevent(e) {
      if (seen.has(e.id)) return
      seen.add(e.id)
      put(e)
      onevent(e)
    },
    oneose: opts.oneose,
  })
  return () => sub.close()
}

/** NIP-50 search. */
export function search(filter: Filter & { search: string }) {
  return query(filter, { relays: SEARCH_RELAYS, maxWait: 5000 })
}

export interface PublishResult {
  ok: string[]
  failed: { relay: string; reason: string }[]
}

export async function broadcast(event: Event, extra: string[] = []): Promise<PublishResult> {
  const relays = writeRelays(extra)
  put(event)
  const results = await Promise.allSettled(pool.publish(relays, event))
  const res: PublishResult = { ok: [], failed: [] }
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') res.ok.push(relays[i])
    else res.failed.push({ relay: relays[i], reason: String(r.reason?.message ?? r.reason) })
  })
  if (!res.ok.length) throw new Error('No relay accepted the event: ' + res.failed.map((f) => f.reason).join('; '))
  return res
}
