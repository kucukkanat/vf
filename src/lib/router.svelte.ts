// Minimal hash router (GitHub Pages has no SPA fallback).
export const route = $state({ path: '/', parts: [] as string[], query: new URLSearchParams() })

function parse() {
  const h = decodeURI(location.hash.replace(/^#/, '')) || '/'
  const [p, q = ''] = h.split('?')
  route.path = p.startsWith('/') ? p : '/' + p
  route.parts = route.path.split('/').filter(Boolean)
  route.query = new URLSearchParams(q)
}
if (typeof window !== 'undefined') {
  parse()
  window.addEventListener('hashchange', () => {
    parse()
    window.scrollTo(0, 0)
  })
}

export const go = (path: string) => {
  location.hash = path
}
export const href = (path: string) => '#' + path
/** Absolute URL (needed for links inside sandboxed layout iframes). */
export const absHref = (path: string) => location.origin + location.pathname + '#' + path
