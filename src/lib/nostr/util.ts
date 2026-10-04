import { nip19 } from 'nostr-tools'
import type { Event } from 'nostr-tools/core'

export type { Event }

export const now = () => Math.floor(Date.now() / 1000)

export const tag = (ev: { tags: string[][] }, name: string) => ev.tags.find((t) => t[0] === name)?.[1]
export const tags = (ev: { tags: string[][] }, name: string) => ev.tags.filter((t) => t[0] === name)
export const tagValues = (ev: { tags: string[][] }, name: string) => tags(ev, name).map((t) => t[1])

export const isReplaceable = (k: number) => k === 0 || k === 3 || (k >= 10000 && k < 20000)
export const isAddressable = (k: number) => k >= 30000 && k < 40000

/** Coordinate key used for replaceable/addressable events ("kind:pubkey:d"). */
export function coord(ev: Pick<Event, 'kind' | 'pubkey' | 'tags'>) {
  return `${ev.kind}:${ev.pubkey}:${isAddressable(ev.kind) ? (tag(ev, 'd') ?? '') : ''}`
}

/** Accepts hex, npub or nprofile; returns hex pubkey or null. */
export function toHex(key: string | undefined | null): string | null {
  if (!key) return null
  key = key.trim()
  if (/^[0-9a-f]{64}$/i.test(key)) return key.toLowerCase()
  try {
    const d = nip19.decode(key)
    if (d.type === 'npub') return d.data
    if (d.type === 'nprofile') return d.data.pubkey
  } catch {}
  return null
}

export const npub = (hex: string) => nip19.npubEncode(hex)
export const shortNpub = (hex: string) => {
  const n = npub(hex)
  return n.slice(0, 10) + '…' + n.slice(-4)
}

export function naddr(kind: number, pubkey: string, d: string) {
  return nip19.naddrEncode({ kind, pubkey, identifier: d })
}
export function decodeNaddr(s: string): { kind: number; pubkey: string; identifier: string } | null {
  try {
    const d = nip19.decode(s)
    if (d.type === 'naddr') return d.data
  } catch {}
  return null
}

export function timeAgo(ts: number) {
  const s = now() - ts
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hrs ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} days ago`
  return new Date(ts * 1000).toLocaleDateString()
}

export const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function safeJson<T>(s: string, fallback: T): T {
  try {
    const v = JSON.parse(s)
    return v && typeof v === 'object' ? v : fallback
  } catch {
    return fallback
  }
}

export const uniq = <T>(a: T[]) => [...new Set(a)]

export function slugify(s: string) {
  return (
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) ||
    Math.random().toString(36).slice(2, 10)
  )
}

/** Newest event per coordinate. */
export function latestByCoord(events: Event[]) {
  const m = new Map<string, Event>()
  for (const e of events) {
    const k = coord(e)
    const prev = m.get(k)
    if (!prev || prev.created_at < e.created_at) m.set(k, e)
  }
  return [...m.values()]
}

export const byNewest = (a: Event, b: Event) => b.created_at - a.created_at

export const safeUrl = (u: string | undefined | null) =>
  u && /^https?:\/\//i.test(u.trim()) ? u.trim() : ''
