// Local account storage. Keys are created from a NIP-06 12-word phrase and stored
// encrypted with the user's password: the key as NIP-49 ncryptsec, and the phrase
// with AES-GCM (PBKDF2-derived key) so it can be revealed later.
import { generateSeedWords, privateKeyFromSeedWords, validateWords } from 'nostr-tools/nip06'
import * as nip49 from 'nostr-tools/nip49'
import { getPublicKey } from 'nostr-tools/pure'
import { nip19 } from 'nostr-tools'

export interface EncBlob {
  salt: string
  iv: string
  data: string
}
export interface StoredAccount {
  pubkey: string
  ncryptsec: string
  phrase?: EncBlob
  createdAt: number
}

const KEY = 'vf:accounts'
const PBKDF2_ITER = 310_000

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

let storage: Pick<Storage, 'getItem' | 'setItem'> | null =
  typeof localStorage !== 'undefined' ? localStorage : null
/** For tests. */
export function useStorage(s: Pick<Storage, 'getItem' | 'setItem'>) {
  storage = s
}

export function listAccounts(): StoredAccount[] {
  try {
    return JSON.parse(storage?.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}
function saveAccounts(a: StoredAccount[]) {
  storage?.setItem(KEY, JSON.stringify(a))
}
export const getAccount = (pubkey: string) => listAccounts().find((a) => a.pubkey === pubkey)

export function removeAccount(pubkey: string) {
  saveAccounts(listAccounts().filter((a) => a.pubkey !== pubkey))
}

async function aesKey(password: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}
export async function encryptText(text: string, password: string): Promise<EncBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await aesKey(password, salt)
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)))
  return { salt: b64(salt), iv: b64(iv), data: b64(data) }
}
export async function decryptText(blob: EncBlob, password: string): Promise<string> {
  const key = await aesKey(password, unb64(blob.salt))
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) as BufferSource }, key, unb64(blob.data) as BufferSource)
    return new TextDecoder().decode(pt)
  } catch {
    throw new Error('Wrong password')
  }
}

export function newPhrase() {
  const phrase = generateSeedWords()
  const sk = privateKeyFromSeedWords(phrase)
  return { phrase, sk, pubkey: getPublicKey(sk) }
}

export function normalizePhrase(p: string) {
  return p.trim().toLowerCase().split(/\s+/).join(' ')
}

export function keyFromPhrase(phrase: string) {
  phrase = normalizePhrase(phrase)
  if (!validateWords(phrase)) throw new Error('That is not a valid 12/24-word backup phrase')
  const sk = privateKeyFromSeedWords(phrase)
  return { phrase, sk, pubkey: getPublicKey(sk) }
}

/** Parses nsec / hex secret key. */
export function parseSecret(input: string): Uint8Array {
  input = input.trim()
  if (/^[0-9a-f]{64}$/i.test(input)) return Uint8Array.from(input.match(/../g)!.map((h) => parseInt(h, 16)))
  const d = nip19.decode(input)
  if (d.type !== 'nsec') throw new Error('Not an nsec key')
  return d.data
}

export function checkPassword(pw: string) {
  if (pw.length < 8) return 'Password must be at least 8 characters'
  return null
}

export async function saveAccount(sk: Uint8Array, password: string, phrase?: string, logn = 16) {
  const pubkey = getPublicKey(sk)
  const acct: StoredAccount = {
    pubkey,
    ncryptsec: nip49.encrypt(sk, password, logn),
    phrase: phrase ? await encryptText(normalizePhrase(phrase), password) : undefined,
    createdAt: Date.now(),
  }
  saveAccounts([acct, ...listAccounts().filter((a) => a.pubkey !== pubkey)])
  return acct
}

export function unlock(pubkey: string, password: string): Uint8Array {
  const a = getAccount(pubkey)
  if (!a) throw new Error('Account not found on this device')
  try {
    return nip49.decrypt(a.ncryptsec, password)
  } catch {
    throw new Error('Wrong password')
  }
}

export function decryptNcryptsec(ncryptsec: string, password: string) {
  try {
    return nip49.decrypt(ncryptsec.trim(), password)
  } catch {
    throw new Error('Wrong password or invalid ncryptsec')
  }
}

export async function revealPhrase(pubkey: string, password: string): Promise<string | null> {
  const a = getAccount(pubkey)
  if (!a) throw new Error('Account not found on this device')
  unlock(pubkey, password) // verifies password
  return a.phrase ? decryptText(a.phrase, password) : null
}

export async function changePassword(pubkey: string, oldPw: string, newPw: string, logn = 16) {
  const sk = unlock(pubkey, oldPw)
  const phrase = await revealPhrase(pubkey, oldPw)
  return saveAccount(sk, newPw, phrase ?? undefined, logn)
}

/** Random distinct word positions (0-based) the user must re-type to confirm the backup. */
export function confirmIndices(n = 3, words = 12) {
  const s = new Set<number>()
  while (s.size < n) s.add(crypto.getRandomValues(new Uint32Array(1))[0] % words)
  return [...s].sort((a, b) => a - b)
}

export function backupText(appName: string, npub: string, phrase: string | null, ncryptsec: string) {
  return [
    `${appName} account backup — KEEP THIS SECRET`,
    `Created: ${new Date().toISOString()}`,
    '',
    `Public key (safe to share): ${npub}`,
    '',
    phrase ? `12-word backup phrase (NIP-06):\n${phrase}\n` : '',
    `Password-encrypted key (NIP-49, needs your password):\n${ncryptsec}`,
    '',
    'Anyone with the 12 words controls your account. Nobody can recover it if you lose',
    'both the words and your password.',
  ].join('\n')
}
