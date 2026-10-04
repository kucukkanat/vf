// Custom profile layouts: sanitized HTML + CSS stored in kind 30078.
import { D } from '../../config'
import { getReplaceable } from '../nostr/cache'
import { query } from '../nostr/pool'
import { publish } from '../nostr/publish'
import { safeJson } from '../nostr/util'

export interface Layout {
  html: string
  css: string
  theme: string
}

export const MAX_LAYOUT = 60_000

export async function loadLayout(pubkey: string): Promise<Layout | null> {
  await query({ kinds: [30078], authors: [pubkey], '#d': [D.layout] })
  const e = getReplaceable(30078, pubkey, D.layout)
  if (!e) return null
  const c = safeJson<Record<string, unknown>>(e.content, {})
  return {
    html: typeof c.html === 'string' ? c.html.slice(0, MAX_LAYOUT) : '',
    css: typeof c.css === 'string' ? c.css.slice(0, MAX_LAYOUT) : '',
    theme: typeof c.theme === 'string' ? c.theme : '',
  }
}

export function saveLayout(l: Layout) {
  return publish({
    kind: 30078,
    content: JSON.stringify({ html: l.html.slice(0, MAX_LAYOUT), css: l.css.slice(0, MAX_LAYOUT), theme: l.theme }),
    tags: [['d', D.layout], ['alt', 'VampireFreeks profile layout']],
  })
}
