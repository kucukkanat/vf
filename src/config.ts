// Site-wide configuration. Edit these values to customize your deployment.
// Lists can also be overridden at build time with comma-separated VITE_* env vars.

function envList(name: string): string[] | undefined {
  const v = (import.meta as any).env?.[name] as string | undefined
  return v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined
}

export const APP_NAME = 'VampireFreeks'
/** Tag carried by every event this app publishes; used to find members and content. */
export const APP_TAG = 'vampirefreeks'
export const D = {
  profile: `${APP_TAG}:profile`,
  layout: `${APP_TAG}:layout`,
  top8: `${APP_TAG}:top8`,
  featured: `${APP_TAG}:featured`,
  presence: `${APP_TAG}:presence`,
}

/** Default public relays. Users' own NIP-65 relays are added on top of these. */
export const DEFAULT_RELAYS: string[] = envList('VITE_RELAYS') ?? [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
]
/** Relay(s) supporting NIP-50 full-text search. */
export const SEARCH_RELAYS: string[] = envList('VITE_SEARCH_RELAYS') ?? ['wss://relay.nostr.band']

/** Default Blossom media servers. Users' kind 10063 list takes priority. */
export const DEFAULT_BLOSSOM: string[] = envList('VITE_BLOSSOM') ?? [
  'https://blossom.primal.net',
  'https://blossom.band',
  'https://nostr.download',
]

/**
 * Site admins (hex pubkeys or npubs). Admins publish site news (journals tagged
 * `vf-news`), featured pics (kind 30006) and the global mute list (kind 10000).
 */
export const ADMINS: string[] = envList('VITE_ADMINS') ?? [
  // 'npub1...'
]

export const FORUM_BOARDS = [
  { id: 'general', name: 'General Discussion', desc: 'Talk about anything.' },
  { id: 'music', name: 'Music', desc: 'Industrial, EBM, goth, metal, darkwave, witch house...' },
  { id: 'fashion', name: 'Fashion & Style', desc: 'Outfits, hair, makeup, cybergoth gear.' },
  { id: 'art', name: 'Art & Writing', desc: 'Share your poetry, drawings and photography.' },
  { id: 'events', name: 'Clubs & Events', desc: 'Gigs, club nights, festivals.' },
  { id: 'help', name: 'Help & Feedback', desc: 'Questions about the site.' },
]

export const SCENES = [
  'goth', 'industrial', 'emo', 'scene', 'punk', 'metal', 'cybergoth', 'deathrock',
  'ebm', 'darkwave', 'rivethead', 'vampire', 'horror', 'witch house', 'post-punk', 'visual kei',
]

export const MIN_JOIN_AGE = 13
export const ADULT_AGE = 18
/** Days a member profile must exist before its pic votes count (outside the WoT). */
export const VOTE_MIN_ACCOUNT_DAYS = 7
export const MAX_SONG_BYTES = 10 * 1024 * 1024
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024
export const PRESENCE_TTL = 10 * 60
