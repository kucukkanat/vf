// Builds the static profile document rendered inside the sandboxed layout iframe.
// Everything user-controlled is escaped, except the custom HTML block which is
// DOMPurify-sanitized. The iframe has no `allow-scripts`, and a CSP blocks scripts too.
import { sanitizeCss, sanitizeLayoutHtml } from './safety/sanitize'
import { absHref } from './router.svelte'
import type { Meta, VFProfile } from './models/profiles.svelte'
import type { Pic } from './models/pics'
import { npub } from './nostr/util'

const esc = (s: string | undefined | null) =>
  (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br>')

export const BASE_PROFILE_CSS = `
html,body{margin:0;background:transparent;color:#d8d8d8;font:11px/1.45 Verdana,Tahoma,sans-serif}
a{color:#ff3355;text-decoration:none}a:hover{color:#ff4fc3;text-decoration:underline}
img{max-width:100%}
#vf-profile{display:grid;grid-template-columns:260px 1fr;gap:10px}
@media(max-width:600px){#vf-profile{grid-template-columns:1fr}}
.vf-box{background:#0d0d0d;border:1px solid #3a0010;margin-bottom:10px}
.vf-box>h3{margin:0;background:linear-gradient(#5a0014,#2a0008);color:#fff;font-size:11px;padding:3px 7px;text-transform:uppercase;letter-spacing:.5px}
.vf-box>.vf-in{padding:8px}
.vf-banner{width:100%;max-height:180px;object-fit:cover;display:block;border:1px solid #3a0010;margin-bottom:10px}
.vf-avatar{width:100%;max-width:240px;aspect-ratio:1;object-fit:cover;border:1px solid #555;display:block;margin:0 auto 6px;background:#111}
.vf-name{font:24px 'UnifrakturCook',Georgia,serif;color:#ff3355;margin:0}
.vf-headline{color:#ff4fc3;font-style:italic;margin:2px 0 6px}
.vf-details td{padding:1px 4px;vertical-align:top}.vf-details td:first-child{color:#8a8a8a;font-weight:bold;white-space:nowrap}
.vf-tag{display:inline-block;border:1px solid #600;background:#200;color:#f9a;padding:0 5px;margin:1px;font-size:9px;border-radius:6px}
.vf-top8{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;font-size:10px}
.vf-top8 img{width:100%;aspect-ratio:1;object-fit:cover;border:1px solid #444;display:block}
.vf-top8 span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vf-pics{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.vf-pics img{width:100%;aspect-ratio:1;object-fit:cover;display:block;border:1px solid #333}
.vf-journals li{margin-bottom:3px}
.vf-mood{color:#7dff3a}
.vf-custom{overflow-wrap:anywhere}
`

export interface ProfileDoc {
  pubkey: string
  meta: Meta | undefined
  vf: VFProfile | undefined
  top8: { pubkey: string; name: string; picture?: string }[]
  friendCount: number
  pics: Pic[]
  journals: { title: string; naddr: string }[]
  online: boolean
  canSeeNsfw: boolean
}

const DEFAULT_AVATAR =
  'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><rect width="50" height="50" fill="#1a0006"/><circle cx="25" cy="19" r="9" fill="#5a0014"/><path d="M8 50c2-12 9-17 17-17s15 5 17 17z" fill="#5a0014"/></svg>')

export function buildProfileHtml(d: ProfileDoc, custom: { html: string; css: string } | null) {
  const name = d.meta?.display_name || d.meta?.name || npub(d.pubkey).slice(0, 16)
  const n = npub(d.pubkey)
  const link = (path: string) => esc(absHref(path))
  const vf = d.vf
  const row = (k: string, v: string | undefined) => (v ? `<tr><td>${k}:</td><td>${esc(v)}</td></tr>` : '')
  const pics = d.pics.filter((p) => !p.nsfw || d.canSeeNsfw).slice(0, 8)

  const body = `
<div id="vf-profile">
  <div class="vf-left">
    <div class="vf-box vf-main"><div class="vf-in">
      <img class="vf-avatar" src="${esc(d.meta?.picture || DEFAULT_AVATAR)}" alt="">
      <h1 class="vf-name">${esc(name)}</h1>
      ${vf?.headline ? `<p class="vf-headline">"${esc(vf.headline)}"</p>` : ''}
      ${d.online ? '<p class="vf-online" style="color:#7dff3a">● online now</p>' : ''}
      ${vf?.mood ? `<p>Mood: <span class="vf-mood">${esc(vf.mood)}</span></p>` : ''}
      <table class="vf-details">
        ${row('Location', vf?.location)}${row('Gender', vf?.gender)}
        ${vf ? `<tr><td>Member since:</td><td>${esc(new Date(vf.joined * 1000).toLocaleDateString())}</td></tr>` : ''}
        ${d.meta?.website ? `<tr><td>Website:</td><td><a href="${esc(d.meta.website)}" target="_blank" rel="noopener noreferrer">${esc(d.meta.website.replace(/^https?:\/\//, ''))}</a></td></tr>` : ''}
      </table>
      ${vf?.scenes.length ? `<p>${vf.scenes.map((s) => `<span class="vf-tag">${esc(s)}</span>`).join(' ')}</p>` : ''}
    </div></div>
    ${vf?.bands ? `<div class="vf-box vf-bands"><h3>Favorite bands</h3><div class="vf-in">${nl2br(vf.bands)}</div></div>` : ''}
    ${d.journals.length ? `<div class="vf-box vf-journals"><h3>Latest journals</h3><div class="vf-in"><ul style="margin:0;padding-left:16px">${d.journals.slice(0, 5).map((j) => `<li><a target="_top" href="${link(`/j/${j.naddr}`)}">${esc(j.title)}</a></li>`).join('')}</ul></div></div>` : ''}
  </div>
  <div class="vf-right">
    ${d.meta?.banner ? `<img class="vf-banner" src="${esc(d.meta.banner)}" alt="">` : ''}
    <div class="vf-box vf-about"><h3>About me</h3><div class="vf-in">${d.meta?.about ? nl2br(d.meta.about) : '<i>This freak hasn\'t written anything yet.</i>'}</div></div>
    ${custom?.html ? `<div class="vf-custom">${sanitizeLayoutHtml(custom.html)}</div>` : ''}
    <div class="vf-box vf-friends"><h3>${esc(name)}'s Top 8 <span style="float:right;text-transform:none;font-weight:normal"><a target="_top" style="color:#fcc" href="${link(`/u/${n}/friends`)}">all ${d.friendCount} friends »</a></span></h3><div class="vf-in">
      ${d.top8.length ? `<div class="vf-top8">${d.top8.map((f) => `<a class="vf-friend" target="_top" href="${link('/u/' + npub(f.pubkey))}"><img src="${esc(f.picture || DEFAULT_AVATAR)}" alt=""><span>${esc(f.name)}</span></a>`).join('')}</div>` : '<i>No Top 8 yet.</i>'}
    </div></div>
    ${pics.length ? `<div class="vf-box vf-picbox"><h3>Pics <span style="float:right;text-transform:none;font-weight:normal"><a target="_top" style="color:#fcc" href="${link(`/u/${n}/pics`)}">view all »</a></span></h3><div class="vf-in"><div class="vf-pics">${pics.map((p) => `<a target="_top" href="${link('/pic/' + p.id)}"><img src="${esc(p.url)}" alt="${esc(p.title)}" loading="lazy"></a>`).join('')}</div></div></div>` : ''}
  </div>
</div>`

  const csp = `default-src 'none'; img-src * data: blob:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; media-src * data:`
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_top"><meta name="referrer" content="no-referrer">
<style>${BASE_PROFILE_CSS}</style>${custom?.css ? `<style>${sanitizeCss(custom.css)}</style>` : ''}</head><body>${body}</body></html>`
}
