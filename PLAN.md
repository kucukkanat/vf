# VampireFreeks — Plan

A parody / tribute of the 2009-era VampireFreaks community, rebuilt as a static
Nostr client. Hosted on GitHub Pages at `https://<user>.github.io/vf/`.
**Not affiliated with VampireFreaks.com.** Original art and branding only.

## Decisions

| Area | Decision |
|---|---|
| Name | VampireFreeks (parody) + "not affiliated" footer |
| Stack | Vite + Svelte 5 + TypeScript + `nostr-tools` (SimplePool), hash routing |
| Hosting | GitHub Pages via Actions, `base: '/vf/'` |
| Look | 2009 retro (black, red/pink, Verdana 10–11px, tables, 88x31 badges) — responsive under 720px |
| Relays | `relay.damus.io`, `nos.lol`, `relay.primal.net`, `relay.nostr.band` (configurable, + user NIP-65 outbox) |
| Media | Blossom (BUD-01/02 upload, BUD-04 mirror). Defaults configurable + user kind 10063 list |
| Login | In-app key generation (NIP-06 12-word phrase + NIP-49 password), NIP-07, NIP-46 bunker, paste nsec/ncryptsec |
| Scope | Members only: users who published a VampireFreeks profile event |
| Moderation | Hardcoded admin npub list → site news, featured pics, global mute list; user mute lists; NIP-56 reports |
| Age | 13+ to join. Birth year stored **locally only**. NSFW (NIP-36) only visible to 18+ who opt in. Under-18: DMs only from mutual friends |
| Layouts | Sanitized HTML + CSS rendered in a sandboxed iframe (no scripts, CSP), interactive controls outside |
| Ratings | 1–10 (kind 7). Votes count only from eligible members: not muted, and (profile older than N days OR inside viewer/admin follow graph) |
| Music | Profile song MP3 uploaded to Blossom (≤10 MB), autoplay off by default |

## Key backup (account creation)

1. Generate a BIP-39 12-word phrase → key derived via NIP-06 (portable to other Nostr apps).
2. Show words once; user must re-type 3 random words to continue.
3. User picks a password: key stored as NIP-49 `ncryptsec`, phrase stored AES-GCM encrypted (PBKDF2) — both in localStorage.
4. Optional "Download backup" .txt (phrase + ncryptsec).
5. Login: restore from 12 words · unlock with password · paste nsec/ncryptsec · NIP-07 · NIP-46.
6. Settings: reveal phrase (password required), change password.
Lose both phrase and password → account unrecoverable (stated plainly in UI).

## Event model

`APP = "vampirefreeks"`; every app event carries `["t","vampirefreeks"]` and `["client","VampireFreeks"]`.

| Feature | Kind | Notes |
|---|---|---|
| Base profile | 0 | name, display_name, about, picture, banner, lud16 |
| VF profile (membership) | 30078 `d=vampirefreeks:profile` | JSON content: headline, location, gender, scenes, bands, song {url,title}, joined. Tags: `t` scenes |
| Layout | 30078 `d=vampirefreeks:layout` | JSON `{html, css}` |
| Friends | 3 | mutual follow = friend |
| Top 8 | 30000 `d=vampirefreeks:top8` | ordered `p` tags |
| Comments | 1111 (NIP-22) | on profile (A=vf profile), pic (E), journal (A), event (A) |
| Pics | 20 (NIP-68) | `imeta`, `title`, `content-warning`, `t` |
| Ratings | 7 | content "1".."10", `e`,`p`,`k=20` |
| Journals | 30023 (NIP-23) | Markdown; admins' journals tagged `vf-news` = site news |
| Featured pics | 30006 `d=vampirefreeks:featured` | admin picture curation set |
| Cults | 34550 (NIP-72) | moderators via `p` tags; posts = 1111 rooted at community; approvals = 4550 |
| My cults | 10004 | NIP-51 community list (`a` tags) |
| Forums | 11 (NIP-7D) threads with board tag `vf-board-<name>`, replies 1111 |
| DMs | 14 → 13 → 1059 (NIP-17/59/44) | publish to recipient 10050 relays if present |
| Online now | 30315 `d=vampirefreeks:presence` + NIP-40 expiration (10 min) | heartbeat every 4 min while visible |
| Events | 31923 (NIP-52) + RSVP 31925 | |
| Mutes / reports | 10000 / 1984 | admin 10000 = global mute |
| Zaps | 9734 / 9735 (NIP-57) | LNURL → invoice → WebLN or `lightning:` link |
| Relay list | 10002 | outbox reads + publishes |
| Search | NIP-50 on relay.nostr.band + client-side directory filter | |

## Architecture

```
src/
  config.ts              relays, admins, blossom servers, thresholds
  lib/nostr/             pool.ts, signer.ts, publish.ts, cache.ts (IndexedDB), util.ts
  lib/auth/              keystore.ts (NIP-06/49 + AES), session.svelte.ts
  lib/models/            profile, layout, social, comments, pics, ratings, journals,
                         cults, forums, dm, presence, events, moderation, zaps
  lib/media/blossom.ts
  lib/safety/            sanitize.ts, age.ts
  lib/router.svelte.ts   hash router
  components/            shared widgets
  routes/                pages
  styles/retro.css
```

## Milestones

1. Skeleton: Vite/Svelte, config, pool, hash router, retro shell, Pages workflow
2. Auth: key generation + 12-word backup + password, NIP-07, NIP-46, nsec, age gate
3. Profiles: kind 0 + VF profile, edit page, profile page, member directory
4. Social graph: friends, Top 8, profile comments, online now
5. Pics: Blossom upload/mirror, gallery, 1–10 ratings, Top Pics, NSFW gate, featured
6. Journals: NIP-23 editor + comments, site news
7. Custom layouts: sandboxed renderer, layout editor, theme gallery, profile song
8. Cults & forums: NIP-72 communities, approvals, boards (NIP-7D)
9. DMs: NIP-17 inbox, under-18 rule
10. Events (NIP-52), search (NIP-50), zaps (NIP-57)
11. Hardening: IndexedDB cache, mutes/reports, admin tools, tests, PWA manifest

## Risks

- Public relays rate-limit / drop kinds → configurable list, IndexedDB cache, outbox.
- Spam → members-only view, admin global mute, WoT-weighted ratings.
- XSS via layouts → sandboxed iframe without `allow-scripts`, CSP in srcdoc, DOMPurify.
- Free Blossom purges → mirror to 2 servers.
- Minors → local-only birth year, NSFW gate, DM restriction (good-faith, unenforceable).
