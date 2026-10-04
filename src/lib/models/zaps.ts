// NIP-57 zaps ("kudos" in Lightning sats).
import { getZapEndpoint, makeZapRequest, getSatoshisAmountFromBolt11 } from 'nostr-tools/nip57'
import { getReplaceable } from '../nostr/cache'
import { query, readRelays } from '../nostr/pool'
import { sign } from '../nostr/publish'
import { tag, type Event } from '../nostr/util'

declare global {
  interface Window {
    webln?: { enable(): Promise<void>; sendPayment(pr: string): Promise<unknown> }
  }
}

export async function zapInvoice(recipient: string, sats: number, comment: string, event?: Event) {
  await query({ kinds: [0], authors: [recipient] })
  const meta = getReplaceable(0, recipient)
  if (!meta) throw new Error('This user has no profile metadata')
  const endpoint = await getZapEndpoint(meta)
  if (!endpoint) throw new Error('This user has no Lightning address (lud16) set')
  const msats = sats * 1000
  const relays = readRelays().slice(0, 4)
  const tmpl = event
    ? makeZapRequest({ event, amount: msats, comment, relays })
    : makeZapRequest({ pubkey: recipient, amount: msats, comment, relays })
  const req = await sign({ kind: tmpl.kind, content: tmpl.content, tags: tmpl.tags }, { appTag: false })
  const url = `${endpoint}?amount=${msats}&nostr=${encodeURIComponent(JSON.stringify(req))}`
  const res = await fetch(url)
  const body = await res.json()
  if (!body.pr) throw new Error(body.reason ?? 'No invoice returned')
  return body.pr as string
}

/** Tries WebLN; returns false if the caller should show the invoice instead. */
export async function payWithWebln(pr: string) {
  if (!window.webln) return false
  try {
    await window.webln.enable()
    await window.webln.sendPayment(pr)
    return true
  } catch {
    return false
  }
}

export async function zapTotal(pubkey: string) {
  const evs = await query({ kinds: [9735], '#p': [pubkey], limit: 500 })
  let sats = 0
  for (const e of evs) {
    const b = tag(e, 'bolt11')
    if (b)
      try {
        sats += getSatoshisAmountFromBolt11(b)
      } catch {}
  }
  return { sats, count: evs.length }
}
