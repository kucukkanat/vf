import { describe, it, expect } from 'vitest'
import { sanitizeCss } from './sanitize'

describe('sanitizeCss', () => {
  it('cannot break out of the style element', () => {
    const out = sanitizeCss('body{color:red}</style><script>alert(1)</script>')
    expect(out).not.toMatch(/<\/style/i)
    expect(out).not.toContain('<')
  })
  it('neutralizes script-ish constructs', () => {
    expect(sanitizeCss('a{width:expression(alert(1))}')).not.toMatch(/expression\(/)
    expect(sanitizeCss('a{background:url(javascript:alert(1))}')).not.toMatch(/javascript:/)
    expect(sanitizeCss('a{-moz-binding:url(x)}')).not.toMatch(/-moz-binding/)
  })
  it('keeps normal css', () => {
    const css = 'body { background: #000 url(https://x.y/bg.gif); color: #f0f; }'
    expect(sanitizeCss(css)).toBe(css)
  })
})
