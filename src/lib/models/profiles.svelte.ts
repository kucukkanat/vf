// Profile metadata (kind 0) + VampireFreeks profile (kind 30078) with batched loading.
import { D } from '../../config'
import { allOfKind, getReplaceable } from '../nostr/cache'
import { query } from '../nostr/pool'
import { publish } from '../nostr/publish'
import { now, safeJson, shortNpub, safeUrl, type Event } from '../nostr/util'

export interface Meta {
  name?: string
  display_name?: string
  about?: string
  picture?: string
  banner?: string
  website?: string
  lud16?: string
  nip05?: string
}

export interface VFProfile {
  headline: string
  location: string
  gender: string
  scenes: string[]
  bands: string
  mood: string
  song: { url: string; title: string } | null
  joined: number
  updated: number
}

export const metas = $state<Record<string, Meta>>({})
export const vfs = $state<Record<string, VFProfile>>({})

export function parseMeta(e: Event): Meta {
  const m = safeJson<Record<string, unknown>>(e.content, {})
  const s = (k: string) => (typeof m[k] === 'string' ? (m[k] as string).slice(0, 2000) : undefined)
  return {
    name: s('name'),
    display_name: s('display_name') || s('displayName'),
    about: s('about'),
    picture: safeUrl(s('picture')) || undefined,
    banner: safeUrl(s('banner')) || undefined,
    website: safeUrl(s('website')) || undefined,
    lud16: s('lud16'),
    nip05: s('nip05'),
  }
}

export function parseVF(e: Event): VFProfile {
  const c = safeJson<Record<string, any>>(e.content, {})
  const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '')
  const songUrl = safeUrl(c.song?.url)
  return {
    headline: str(c.headline, 140),
    location: str(c.location, 80),
    gender: str(c.gender, 40),
    scenes: Array.isArray(c.scenes) ? c.scenes.filter((s: unknown) => typeof s === 'string').slice(0, 12) : [],
    bands: str(c.bands, 1000),
    mood: str(c.mood, 60),
    song: songUrl ? { url: songUrl, title: str(c.song?.title, 120) || 'Untitled' } : null,
    joined: typeof c.joined === 'number' && c.joined <= e.created_at ? c.joined : e.created_at,
    updated: e.created_at,
  }
}

function apply(e: Event) {
  if (e.kind === 0) {
    const cur = getReplaceable(0, e.pubkey)
    if (cur && cur.id !== e.id && cur.created_at > e.created_at) return
    metas[e.pubkey] = parseMeta(cur ?? e)
  } else if (e.kind === 30078) {
    const cur = getReplaceable(30078, e.pubkey, D.profile) ?? e
    vfs[e.pubkey] = parseVF(cur)
  }
}

/** Populate from the IndexedDB cache. */
export function hydrateProfiles() {
  for (const e of allOfKind(0)) apply(e)
  for (const e of allOfKind(30078, D.profile)) apply(e)
}

const queue = new Set<string>()
const requested = new Set<string>()
let timer: ReturnType<typeof setTimeout> | null = null

/** Request metadata for a pubkey (batched). */
export function want(pubkey: string | null | undefined, force = false) {
  if (!pubkey) return
  if (!force && requested.has(pubkey)) return
  requested.add(pubkey)
  queue.add(pubkey)
  if (!timer) timer = setTimeout(flush, 60)
}

async function flush() {
  timer = null
  const authors = [...queue]
  queue.clear()
  for (let i = 0; i < authors.length; i += 150) {
    const chunk = authors.slice(i, i + 150)
    const [k0, vf] = await Promise.all([
      query({ kinds: [0], authors: chunk }),
      query({ kinds: [30078], authors: chunk, '#d': [D.profile] }),
    ])
    k0.forEach(apply)
    vf.forEach(apply)
  }
}

export async function refreshProfile(pubkey: string) {
  const [k0, vf] = await Promise.all([
    query({ kinds: [0], authors: [pubkey] }),
    query({ kinds: [30078], authors: [pubkey], '#d': [D.profile] }),
  ])
  k0.forEach(apply)
  vf.forEach(apply)
}

export function displayName(pubkey: string) {
  want(pubkey)
  const m = metas[pubkey]
  return (m?.display_name || m?.name || shortNpub(pubkey)).slice(0, 60)
}

export const isMember = (pubkey: string) => !!vfs[pubkey]

/** Loads the member directory (everyone who published a VF profile). */
export async function loadMembers(limit = 500) {
  const evs = await query({ kinds: [30078], '#d': [D.profile], limit }, { maxWait: 6000 })
  evs.forEach(apply)
  const missing = evs.map((e) => e.pubkey).filter((p) => !metas[p])
  missing.forEach((p) => want(p))
  return evs.map((e) => e.pubkey)
}

export async function saveProfile(pubkey: string, meta: Meta, vf: Omit<VFProfile, 'joined' | 'updated'>) {
  // preserve unknown kind 0 fields set by other clients
  const cur0 = getReplaceable(0, pubkey)
  const base = cur0 ? safeJson<Record<string, unknown>>(cur0.content, {}) : {}
  const merged: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(meta)) {
    if (v) merged[k] = v
    else delete merged[k]
  }
  const e0 = await publish({ kind: 0, content: JSON.stringify(merged) }, { appTag: false })
  apply(e0)
  const joined = vfs[pubkey]?.joined ?? now()
  const ev = await publish({
    kind: 30078,
    content: JSON.stringify({ ...vf, joined }),
    tags: [['d', D.profile], ['alt', 'VampireFreeks member profile'], ...vf.scenes.map((s) => ['t', s.toLowerCase()])],
  })
  apply(ev)
  return ev
}
