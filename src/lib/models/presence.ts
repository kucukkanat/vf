// "Online now": NIP-38 status events with NIP-40 expiration, refreshed while the tab is visible.
import { D, PRESENCE_TTL } from '../../config'
import { query } from '../nostr/pool'
import { publish } from '../nostr/publish'
import { now, tag } from '../nostr/util'

let timer: ReturnType<typeof setInterval> | null = null

async function beat() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
  try {
    await publish({
      kind: 30315,
      content: '',
      tags: [['d', D.presence], ['expiration', String(now() + PRESENCE_TTL)], ['alt', 'online on VampireFreeks']],
    })
  } catch {}
}

export function startPresence() {
  stopPresence()
  beat()
  timer = setInterval(beat, (PRESENCE_TTL * 1000) / 2.5)
}
export function stopPresence() {
  if (timer) clearInterval(timer)
  timer = null
}

export async function whoIsOnline(): Promise<string[]> {
  const evs = await query({ kinds: [30315], '#d': [D.presence], since: now() - PRESENCE_TTL })
  const t = now()
  return [...new Set(evs.filter((e) => Number(tag(e, 'expiration') ?? 0) > t).map((e) => e.pubkey))]
}
