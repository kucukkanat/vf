# VampireFreeks 🦇

A fan-made parody/tribute of the 2009-era dark alternative community, rebuilt as a
static [Nostr](https://nostr.com) client. There are no servers. Profiles, pics, journals,
friends, cults, forums, events and DMs are Nostr events on public relays, and media
lives on Blossom servers. **Not affiliated with VampireFreaks.com.**

See [PLAN.md](PLAN.md) for the full design and event model.

## Features

- **Accounts**: in-app key generation with a 12-word backup phrase (NIP-06) and
  password-encrypted storage (NIP-49). Phrase confirmation, backup download, reveal and
  change password in settings. Also NIP-07 extensions, NIP-46 bunkers, nsec or ncryptsec.
- **Profiles**: headline, location, scenes, bands, mood, main pic and banner, and a profile song (MP3 on Blossom).
- **Custom layouts**: sanitized HTML and CSS rendered in a sandboxed, script-less iframe, with preset themes and "copy a layout".
- **Friends**: mutual follows, friend requests, Top 8.
- **Pics**: NIP-68 uploads with mirroring, 1–10 ratings weighted toward trusted voters, Top Pics, featured pics, NSFW gate.
- **Journals**: NIP-23 entries with mood and "listening to". Admin journals tagged `vf-news` become site news.
- **Comments everywhere**: NIP-22, on profiles, pics, journals, threads and events.
- **Cults**: NIP-72 moderated communities with approvals and membership (NIP-51 kind 10004).
- **Forums**: NIP-7D threads on fixed boards.
- **Messages**: NIP-17 end-to-end encrypted DMs. Members under 18 only receive DMs from mutual friends.
- **Events**: NIP-52 calendar events with RSVPs.
- **Also**: online now (NIP-38 + NIP-40), member search (local filter + NIP-50), Lightning kudos (NIP-57), block and report, admin tools.
- **Age gate**: 13+. The birth year stays in the browser, and NSFW is visible only to users 18 and older.

## Develop

```sh
npm install
npm run dev            # uses the public relays from src/config.ts
npm run check && npm test
```

Offline development against a local relay + Blossom server:

```sh
node scripts/mock-relay.mjs 7777 &
VITE_RELAYS=ws://localhost:7777 VITE_BLOSSOM=http://localhost:7777 npm run dev
```

End-to-end tests (spins up the mock relay and a preview build):

```sh
npx playwright test    # set PW_CHROMIUM=/path/to/chrome to use a preinstalled browser
```

## Deploy to GitHub Pages

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Optional: **Settings → Secrets and variables → Actions → Variables**, add `VF_ADMINS`
   (comma-separated npubs) to enable site news, featured pics and the global block list.
3. Push to `main`. The workflow typechecks, tests, builds with base `/<repo>/` and deploys.

## Configuration

Edit `src/config.ts`. It holds the relays, Blossom servers, admins, forum boards, scenes and age limits.
Lists can also be overridden at build time with `VITE_RELAYS`, `VITE_SEARCH_RELAYS`,
`VITE_BLOSSOM` and `VITE_ADMINS`.
