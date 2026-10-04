import { describe, it, expect } from 'vitest'
import { aggregate, parsePic } from './pics'

const ev = (pubkey: string, pic: string, content: string, created_at = 1) =>
  ({ id: Math.random().toString(), pubkey, kind: 7, created_at, content, tags: [['e', pic]], sig: '' }) as any

describe('ratings', () => {
  it('uses latest vote per voter, ignores ineligible, invalid and self votes', () => {
    const evs = [
      ev('a', 'p1', '3', 1),
      ev('a', 'p1', '9', 2),
      ev('b', 'p1', '7'),
      ev('c', 'p1', '10'), // ineligible
      ev('d', 'p1', '11'), // invalid
      ev('owner', 'p1', '10'), // self vote
    ]
    const s = aggregate(evs, (pk) => pk !== 'c', 'a', { p1: 'owner' })
    expect(s.p1.count).toBe(2)
    expect(s.p1.avg).toBe(8)
    expect(s.p1.mine).toBe(9)
  })
})

describe('parsePic', () => {
  it('reads imeta url and content-warning', () => {
    const p = parsePic({
      id: 'x', pubkey: 'y', kind: 20, created_at: 1, content: 'desc', sig: '',
      tags: [['title', 'me'], ['imeta', 'url https://cdn.example/a.jpg', 'm image/jpeg', 'fallback https://m.example/a.jpg'], ['content-warning', '']],
    } as any)
    expect(p?.url).toBe('https://cdn.example/a.jpg')
    expect(p?.fallbacks).toEqual(['https://m.example/a.jpg'])
    expect(p?.nsfw).toBe('NSFW')
  })
  it('rejects non-http urls', () => {
    expect(parsePic({ id: 'x', pubkey: 'y', kind: 20, created_at: 1, content: '', sig: '', tags: [['imeta', 'url javascript:alert(1)']] } as any)).toBeNull()
  })
})
