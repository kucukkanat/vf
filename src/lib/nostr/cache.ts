// Event cache: in-memory, with replaceable/addressable events persisted to IndexedDB
// so profiles, layouts and lists render instantly on repeat visits.
import { coord, isAddressable, isReplaceable, type Event } from './util'

const byId = new Map<string, Event>()
const byCoord = new Map<string, Event>()
const PERSIST_KINDS = new Set([0, 3, 10000, 10002, 10004, 10050, 10063, 30000, 30078, 34550])
const DB = 'vf-cache'
const STORE = 'events'
const MAX_PERSIST = 5000

let dbp: Promise<IDBDatabase | null> | null = null
function db(): Promise<IDBDatabase | null> {
  if (dbp) return dbp
  dbp = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbp
}

let pending = new Map<string, Event>()
let flushTimer: ReturnType<typeof setTimeout> | null = null
function schedulePersist(e: Event) {
  pending.set(coord(e), e)
  if (flushTimer) return
  flushTimer = setTimeout(async () => {
    flushTimer = null
    const batch = pending
    pending = new Map()
    const d = await db()
    if (!d) return
    try {
      const tx = d.transaction(STORE, 'readwrite')
      for (const [k, v] of batch) tx.objectStore(STORE).put(v, k)
    } catch {}
  }, 500)
}

/** Adds an event; returns true when it is new (or newer for replaceables). */
export function put(e: Event): boolean {
  if (byId.has(e.id)) return false
  byId.set(e.id, e)
  if (isReplaceable(e.kind) || isAddressable(e.kind)) {
    const k = coord(e)
    const prev = byCoord.get(k)
    if (prev && prev.created_at >= e.created_at) return false
    byCoord.set(k, e)
    if (PERSIST_KINDS.has(e.kind)) schedulePersist(e)
  }
  return true
}

export const getById = (id: string) => byId.get(id)
export const getReplaceable = (kind: number, pubkey: string, d = '') =>
  byCoord.get(`${kind}:${pubkey}:${d}`)

/** All cached replaceables of a kind, optionally restricted to a d-tag. */
export function allOfKind(kind: number, d?: string) {
  const out: Event[] = []
  for (const [k, e] of byCoord) {
    if (e.kind !== kind) continue
    if (d !== undefined && !k.endsWith(':' + d)) continue
    out.push(e)
  }
  return out
}

export function forget(id: string) {
  const e = byId.get(id)
  if (!e) return
  byId.delete(id)
  const k = coord(e)
  if (byCoord.get(k)?.id === id) byCoord.delete(k)
}

/** Loads persisted events into memory. Call once at startup. */
export async function hydrate() {
  const d = await db()
  if (!d) return
  await new Promise<void>((resolve) => {
    try {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).getAll()
      req.onsuccess = () => {
        const all = (req.result as Event[]).sort((a, b) => b.created_at - a.created_at)
        for (const e of all.slice(0, MAX_PERSIST)) put(e)
        resolve()
      }
      req.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

export async function clearCache() {
  byId.clear()
  byCoord.clear()
  const d = await db()
  if (d) d.transaction(STORE, 'readwrite').objectStore(STORE).clear()
}
