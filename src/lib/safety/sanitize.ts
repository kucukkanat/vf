// Sanitizers for user-supplied HTML, CSS and Markdown.
import DOMPurify from 'dompurify'
import { marked } from 'marked'

const LAYOUT_FORBID = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select',
  'meta', 'link', 'base', 'frame', 'frameset', 'applet', 'style', 'template', 'noscript', 'svg', 'math']

/** HTML for custom profile sections (rendered inside a script-less sandboxed iframe). */
export function sanitizeLayoutHtml(html: string) {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: LAYOUT_FORBID,
    FORBID_ATTR: ['srcdoc', 'formaction', 'action', 'ping'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  })
}

/** CSS for custom layouts. Strips constructs that can escape <style> or run code. */
export function sanitizeCss(css: string) {
  return css
    .slice(0, 60_000)
    .replace(/<\/?\s*style/gi, '')
    .replace(/<!--|-->/g, '')
    .replace(/</g, '')
    .replace(/expression\s*\(/gi, 'blocked(')
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/vbscript\s*:/gi, 'blocked:')
    .replace(/-moz-binding/gi, 'blocked')
    .replace(/behavior\s*:/gi, 'blocked:')
    .replace(/@import\s+url\(\s*['"]?(?!https:)[^)]*\)/gi, '')
}

marked.setOptions({ gfm: true, breaks: true })

/** Markdown -> safe HTML for journals and posts in the main document. */
export function renderMarkdown(md: string) {
  const html = marked.parse(md, { async: false }) as string
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: [...LAYOUT_FORBID, 'video', 'audio'],
    FORBID_ATTR: ['style', 'class', 'id'],
  })
}

/** Plain text with URLs, nostr: npubs and line breaks turned into safe HTML. */
export function renderText(text: string) {
  const esc = text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
  return esc
    .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (u) => {
      if (/\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(u)) return `<a href="${u}" target="_blank" rel="noopener noreferrer"><img class="inline-img" src="${u}" alt="" loading="lazy"></a>`
      return `<a href="${u}" target="_blank" rel="noopener noreferrer nofollow">${u}</a>`
    })
    .replace(/nostr:(npub1[02-9ac-hj-np-z]{58})/g, (_m, n) => `<a href="#/u/${n}">@${n.slice(0, 12)}…</a>`)
    .replace(/\n/g, '<br>')
}

if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? ''
      if (!href.startsWith('#')) {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer nofollow')
      }
    }
  })
}
