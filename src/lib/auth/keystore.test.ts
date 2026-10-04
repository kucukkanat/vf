import { describe, it, expect, beforeEach } from 'vitest'
import * as ks from './keystore'

const mem = new Map<string, string>()
ks.useStorage({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) })

describe('keystore', () => {
  beforeEach(() => mem.clear())

  it('creates a phrase account, unlocks and reveals the phrase', async () => {
    const { phrase, sk, pubkey } = ks.newPhrase()
    expect(phrase.split(' ')).toHaveLength(12)
    await ks.saveAccount(sk, 'hunter2hunter2', phrase, 4)
    expect(ks.unlock(pubkey, 'hunter2hunter2')).toEqual(sk)
    expect(() => ks.unlock(pubkey, 'nope-nope')).toThrow('Wrong password')
    expect(await ks.revealPhrase(pubkey, 'hunter2hunter2')).toBe(phrase)
  })

  it('restores the same key from the phrase', () => {
    const a = ks.newPhrase()
    const b = ks.keyFromPhrase('  ' + a.phrase.toUpperCase() + ' ')
    expect(b.pubkey).toBe(a.pubkey)
    expect(() => ks.keyFromPhrase('not a real phrase at all')).toThrow()
  })

  it('NIP-06 test vector', () => {
    const { pubkey } = ks.keyFromPhrase(
      'leader monkey parrot ring guide accident before fence cannon height naive bean',
    )
    expect(pubkey).toBe('17162c921dc4d2518f9a101db33695df1afb56ab82f5ff3e5da6eec3ca5cd917')
  })

  it('changes password', async () => {
    const { phrase, sk, pubkey } = ks.newPhrase()
    await ks.saveAccount(sk, 'oldpassword', phrase, 4)
    await ks.changePassword(pubkey, 'oldpassword', 'newpassword', 4)
    expect(ks.unlock(pubkey, 'newpassword')).toEqual(sk)
    expect(await ks.revealPhrase(pubkey, 'newpassword')).toBe(phrase)
  })

  it('confirmIndices returns distinct sorted positions', () => {
    const idx = ks.confirmIndices()
    expect(new Set(idx).size).toBe(3)
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
  })
})
