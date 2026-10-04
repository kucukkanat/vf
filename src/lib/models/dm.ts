// NIP-17 private messages: kind 14 rumor -> kind 13 seal -> kind 1059 gift wrap.
import { finalizeEvent, generateSecretKey, getEventHash } from 'nostr-tools/pure'
import * as nip44 from 'nostr-tools/nip44'
import { getReplaceable } from '../nostr/cache'
import { broadcast, query, readRelays } from '../nostr/pool'
import { now, tagValues, type Event } from '../nostr/util'
import type { Signer } from '../nostr/signer'

export interface Rumor {
  id: string
  pubkey: string
  kind: number
  created_at: number
  content: string
  tags: string[][]
}

const TWO_DAYS = 2 * 86400
const randomPast = () => now() - Math.floor(Math.random() * TWO_DAYS)

export function makeRumor(from: string, to: string, content: string, replyTo?: string): Rumor {
  const tags = [['p', to]]
  if (replyTo) tags.push(['e', replyTo])
  const r: any = { pubkey: from, kind: 14, created_at: now(), content, tags }
  r.id = getEventHash(r)
  return r
}

export async function wrap(signer: Signer, rumor: Rumor, recipient: string): Promise<Event> {
  const seal = await signer.signEvent({
    kind: 13,
    content: await signer.nip44Encrypt(recipient, JSON.stringify(rumor)),
    created_at: randomPast(),
    tags: [],
  })
  const eph = generateSecretKey()
  return finalizeEvent(
    {
      kind: 1059,
      content: nip44.v2.encrypt(JSON.stringify(seal), nip44.v2.utils.getConversationKey(eph, recipient)),
      created_at: randomPast(),
      tags: [['p', recipient]],
    },
    eph,
  )
}

export async function unwrap(signer: Signer, gift: Event): Promise<Rumor | null> {
  try {
    const seal = JSON.parse(await signer.nip44Decrypt(gift.pubkey, gift.content)) as Event
    if (seal.kind !== 13) return null
    const rumor = JSON.parse(await signer.nip44Decrypt(seal.pubkey, seal.content)) as Rumor
    if (rumor.pubkey !== seal.pubkey || rumor.kind !== 14) return null
    return rumor
  } catch {
    return null
  }
}

export async function dmRelays(pubkey: string) {
  await query({ kinds: [10050], authors: [pubkey] }, { maxWait: 2500 })
  const e = getReplaceable(10050, pubkey)
  return e ? tagValues(e, 'relay').slice(0, 4) : []
}

export async function sendDM(signer: Signer, to: string, content: string, replyTo?: string) {
  const me = await signer.getPublicKey()
  const rumor = makeRumor(me, to, content.slice(0, 10000), replyTo)
  const [theirs, mine] = await Promise.all([dmRelays(to), dmRelays(me)])
  await broadcast(await wrap(signer, rumor, to), theirs)
  await broadcast(await wrap(signer, rumor, me), mine)
  return rumor
}

export async function fetchInbox(signer: Signer, since?: number) {
  const me = await signer.getPublicKey()
  const mine = await dmRelays(me)
  const gifts = await query({ kinds: [1059], '#p': [me], limit: 1000, ...(since ? { since } : {}) }, { relays: readRelays(mine), maxWait: 6000 })
  const out: Rumor[] = []
  for (const g of gifts) {
    const r = await unwrap(signer, g)
    if (r) out.push(r)
  }
  return out
}

/** The other participant of a 1:1 conversation. */
export function peerOf(r: Rumor, me: string) {
  return r.pubkey === me ? (tagValues(r as any, 'p').find((p) => p !== me) ?? me) : r.pubkey
}

export function conversations(rumors: Rumor[], me: string) {
  const m = new Map<string, Rumor[]>()
  const seen = new Set<string>()
  for (const r of rumors) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    const peer = peerOf(r, me)
    if (!m.has(peer)) m.set(peer, [])
    m.get(peer)!.push(r)
  }
  for (const list of m.values()) list.sort((a, b) => a.created_at - b.created_at)
  return m
}

