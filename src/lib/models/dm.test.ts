import { describe, it, expect } from 'vitest'
import { generateSecretKey, getPublicKey, verifyEvent } from 'nostr-tools/pure'
import { LocalSigner } from '../nostr/signer'
import { makeRumor, unwrap, wrap, conversations } from './dm'

describe('NIP-17 DMs', () => {
  it('wraps and unwraps for recipient and sender', async () => {
    const a = new LocalSigner(generateSecretKey())
    const bSk = generateSecretKey()
    const b = new LocalSigner(bSk)
    const apk = await a.getPublicKey()
    const bpk = getPublicKey(bSk)
    const rumor = makeRumor(apk, bpk, 'hey, nice layout <3')
    const gift = await wrap(a, rumor, bpk)
    expect(gift.kind).toBe(1059)
    expect(verifyEvent(gift)).toBe(true)
    expect(gift.pubkey).not.toBe(apk)
    const got = await unwrap(b, gift)
    expect(got?.content).toBe('hey, nice layout <3')
    expect(got?.pubkey).toBe(apk)
    // a third party cannot read it
    expect(await unwrap(new LocalSigner(generateSecretKey()), gift)).toBeNull()
    // sender copy
    const self = await unwrap(a, await wrap(a, rumor, apk))
    const convs = conversations([got!, self!], apk)
    expect([...convs.keys()]).toEqual([bpk])
    expect(convs.get(bpk)).toHaveLength(1)
  })

  it('rejects a seal whose signer differs from the rumor author', async () => {
    const a = new LocalSigner(generateSecretKey())
    const mallory = new LocalSigner(generateSecretKey())
    const bSk = generateSecretKey()
    const bpk = getPublicKey(bSk)
    const forged = makeRumor(await a.getPublicKey(), bpk, 'forged')
    const gift = await wrap(mallory, forged, bpk)
    expect(await unwrap(new LocalSigner(bSk), gift)).toBeNull()
  })
})
