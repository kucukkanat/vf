import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46'
import { generateSecretKey } from 'nostr-tools/pure'
import { bytesToHex, hexToBytes } from 'nostr-tools/utils'
import { LocalSigner, Nip07Signer, RemoteSigner, type Signer } from '../nostr/signer'
import { pool } from '../nostr/pool'

const KEY = 'vf:session'
const TAB_KEY = 'vf:sk'

interface Persisted {
  method: 'local' | 'nip07' | 'bunker'
  pubkey: string
  bunker?: { clientSk: string; uri: string }
}

export const session = $state<{ pubkey: string | null; signer: Signer | null; locked: string | null; ready: boolean }>({
  pubkey: null,
  signer: null,
  /** pubkey of a stored local account awaiting password (set on reload). */
  locked: null,
  ready: false,
})

const loginHooks: ((pubkey: string) => void)[] = []
export function onLogin(fn: (pubkey: string) => void) {
  loginHooks.push(fn)
}

function persist(p: Persisted | null) {
  if (p) localStorage.setItem(KEY, JSON.stringify(p))
  else localStorage.removeItem(KEY)
}

async function finish(signer: Signer, p: Omit<Persisted, 'pubkey'>) {
  const pubkey = await signer.getPublicKey()
  session.signer = signer
  session.pubkey = pubkey
  session.locked = null
  persist({ ...p, pubkey })
  for (const h of loginHooks) h(pubkey)
  return pubkey
}

export function loginLocal(sk: Uint8Array) {
  try {
    sessionStorage.setItem(TAB_KEY, bytesToHex(sk))
  } catch {}
  return finish(new LocalSigner(sk), { method: 'local' })
}

export async function loginNip07() {
  if (!window.nostr) throw new Error('No Nostr extension found (try Alby, nos2x or Keys.band)')
  return finish(new Nip07Signer(), { method: 'nip07' })
}

export async function loginBunker(input: string, onauth?: (url: string) => void) {
  const bp = await parseBunkerInput(input.trim())
  if (!bp) throw new Error('Invalid bunker:// URL or NIP-05 address')
  const clientSk = generateSecretKey()
  const b = BunkerSigner.fromBunker(clientSk, bp, { pool, onauth: (u) => (onauth ? onauth(u) : window.open(u, '_blank')) })
  await b.connect()
  return finish(new RemoteSigner(b), { method: 'bunker', bunker: { clientSk: bytesToHex(clientSk), uri: input.trim() } })
}

/** Restores the previous session on page load. */
export async function restoreSession() {
  try {
    const p: Persisted | null = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!p) return
    if (p.method === 'local') {
      const hex = sessionStorage.getItem(TAB_KEY)
      if (hex) await finish(new LocalSigner(hexToBytes(hex)), { method: 'local' })
      else session.locked = p.pubkey
    } else if (p.method === 'nip07') {
      // extensions inject window.nostr asynchronously
      for (let i = 0; i < 20 && !window.nostr; i++) await new Promise((r) => setTimeout(r, 100))
      if (window.nostr) await finish(new Nip07Signer(), { method: 'nip07' })
    } else if (p.method === 'bunker' && p.bunker) {
      const bp = await parseBunkerInput(p.bunker.uri)
      if (bp) {
        const b = BunkerSigner.fromBunker(hexToBytes(p.bunker.clientSk), bp, { pool, onauth: (u) => window.open(u, '_blank') })
        await finish(new RemoteSigner(b), p)
      }
    }
  } catch (e) {
    console.warn('session restore failed', e)
  } finally {
    session.ready = true
  }
}

export function logout() {
  if (session.signer instanceof RemoteSigner) session.signer.close().catch(() => {})
  session.signer = null
  session.pubkey = null
  session.locked = null
  try {
    sessionStorage.removeItem(TAB_KEY)
  } catch {}
  persist(null)
}

export function requireSigner(): Signer {
  if (!session.signer) throw new Error('Please log in first')
  return session.signer
}
