import { finalizeEvent, getPublicKey } from 'nostr-tools/pure'
import * as nip44 from 'nostr-tools/nip44'
import type { EventTemplate } from 'nostr-tools/core'
import type { Event } from './util'

export type SignerType = 'local' | 'nip07' | 'bunker'

export interface Signer {
  type: SignerType
  getPublicKey(): Promise<string>
  signEvent(t: EventTemplate): Promise<Event>
  nip44Encrypt(pubkey: string, plaintext: string): Promise<string>
  nip44Decrypt(pubkey: string, ciphertext: string): Promise<string>
}

export class LocalSigner implements Signer {
  type = 'local' as const
  private pk: string
  constructor(private sk: Uint8Array) {
    this.pk = getPublicKey(sk)
  }
  async getPublicKey() {
    return this.pk
  }
  async signEvent(t: EventTemplate) {
    return finalizeEvent(t, this.sk)
  }
  async nip44Encrypt(pubkey: string, plaintext: string) {
    return nip44.v2.encrypt(plaintext, nip44.v2.utils.getConversationKey(this.sk, pubkey))
  }
  async nip44Decrypt(pubkey: string, ciphertext: string) {
    return nip44.v2.decrypt(ciphertext, nip44.v2.utils.getConversationKey(this.sk, pubkey))
  }
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>
      signEvent(t: EventTemplate): Promise<Event>
      nip44?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>
        decrypt(pubkey: string, ciphertext: string): Promise<string>
      }
    }
  }
}

export class Nip07Signer implements Signer {
  type = 'nip07' as const
  private ext() {
    if (!window.nostr) throw new Error('No Nostr browser extension found')
    return window.nostr
  }
  getPublicKey() {
    return this.ext().getPublicKey()
  }
  signEvent(t: EventTemplate) {
    return this.ext().signEvent(t)
  }
  nip44Encrypt(pubkey: string, plaintext: string) {
    const n = this.ext().nip44
    if (!n) throw new Error('Your extension does not support NIP-44 encryption')
    return n.encrypt(pubkey, plaintext)
  }
  nip44Decrypt(pubkey: string, ciphertext: string) {
    const n = this.ext().nip44
    if (!n) throw new Error('Your extension does not support NIP-44 encryption')
    return n.decrypt(pubkey, ciphertext)
  }
}

/** Wraps nostr-tools' BunkerSigner (NIP-46). */
export class RemoteSigner implements Signer {
  type = 'bunker' as const
  constructor(
    private inner: {
      getPublicKey(): Promise<string>
      signEvent(t: EventTemplate): Promise<Event>
      nip44Encrypt(pk: string, pt: string): Promise<string>
      nip44Decrypt(pk: string, ct: string): Promise<string>
      close(): Promise<void>
    },
  ) {}
  getPublicKey() {
    return this.inner.getPublicKey()
  }
  signEvent(t: EventTemplate) {
    return this.inner.signEvent(t)
  }
  nip44Encrypt(pk: string, pt: string) {
    return this.inner.nip44Encrypt(pk, pt)
  }
  nip44Decrypt(pk: string, ct: string) {
    return this.inner.nip44Decrypt(pk, ct)
  }
  close() {
    return this.inner.close()
  }
}
