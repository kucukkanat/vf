import type { EventTemplate } from 'nostr-tools/core'
import { APP_NAME, APP_TAG } from '../../config'
import { requireSigner } from '../auth/session.svelte'
import { broadcast } from './pool'
import { getReplaceable } from './cache'
import { query } from './pool'
import { isAddressable, isReplaceable, now, tag, type Event } from './util'

export interface Draft {
  kind: number
  content?: string
  tags?: string[][]
  created_at?: number
}

/** Signs a draft, adding the app tag and NIP-89 client tag unless disabled. */
export async function sign(d: Draft, opts: { appTag?: boolean } = {}): Promise<Event> {
  const tags = [...(d.tags ?? [])]
  if (opts.appTag !== false) {
    if (!tags.some((t) => t[0] === 't' && t[1] === APP_TAG)) tags.push(['t', APP_TAG])
    if (!tags.some((t) => t[0] === 'client')) tags.push(['client', APP_NAME])
  }
  let created_at = d.created_at ?? now()
  // Replaceable events must be strictly newer than the copy relays already hold,
  // otherwise two saves within one second can leave the older one in place.
  if (isReplaceable(d.kind) || isAddressable(d.kind)) {
    const signer = requireSigner()
    const prev = getReplaceable(d.kind, await signer.getPublicKey(), isAddressable(d.kind) ? (tags.find((x) => x[0] === 'd')?.[1] ?? '') : '')
    if (prev && prev.created_at >= created_at) created_at = prev.created_at + 1
  }
  const t: EventTemplate = { kind: d.kind, content: d.content ?? '', tags, created_at }
  return requireSigner().signEvent(t)
}

export async function publish(d: Draft, opts: { appTag?: boolean; relays?: string[] } = {}) {
  const ev = await sign(d, opts)
  await broadcast(ev, opts.relays)
  return ev
}

/**
 * Fetches the freshest copy of a replaceable list (kind 3, 10000, 10004, 30000...) from
 * relays, applies a mutation to its tags and republishes, preserving entries other
 * apps added.
 */
export async function updateList(
  kind: number,
  pubkey: string,
  mutate: (tags: string[][]) => string[][],
  opts: { d?: string; appTag?: boolean } = {},
) {
  const filter: any = { kinds: [kind], authors: [pubkey] }
  if (opts.d !== undefined) filter['#d'] = [opts.d]
  await query(filter, { maxWait: 3000 })
  const cur = getReplaceable(kind, pubkey, opts.d ?? '')
  let tags = cur ? cur.tags.filter((t) => t[0] !== 'client') : []
  if (opts.d !== undefined && !tags.some((t) => t[0] === 'd')) tags.unshift(['d', opts.d])
  tags = mutate(tags)
  return publish({ kind, content: cur?.content ?? '', tags }, { appTag: opts.appTag ?? false })
}

/** Deletes events (NIP-09). */
export function deleteEvents(events: Event[], reason = '') {
  const tags: string[][] = []
  for (const e of events) {
    tags.push(['e', e.id])
    const d = tag(e, 'd')
    if (e.kind >= 30000 && e.kind < 40000 && d !== undefined) tags.push(['a', `${e.kind}:${e.pubkey}:${d}`])
    tags.push(['k', String(e.kind)])
  }
  return publish({ kind: 5, content: reason, tags }, { appTag: false })
}
