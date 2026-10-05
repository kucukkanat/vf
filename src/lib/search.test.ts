import { describe, it, expect } from 'vitest'
import { fold, matchesAny } from './search'

describe('member search folding', () => {
  it('ignores accents, Turkish dotless i, case and spaces', () => {
    expect(fold('Eşek Sıpası')).toBe('eseksipasi')
    expect(matchesAny('eseksipasi', ['Eşek Sıpası'])).toBe(true)
    expect(matchesAny('esek sipasi', ['Eşek Sıpası'])).toBe(true)
    expect(matchesAny('SIPASI', ['eşek_sıpası'])).toBe(true)
    expect(matchesAny('İstanbul', ['istanbul'])).toBe(true)
    expect(matchesAny('Björk', ['bjork'])).toBe(true)
  })
  it('does not match unrelated names', () => {
    expect(matchesAny('raven', ['Eşek Sıpası', undefined])).toBe(false)
  })
})
