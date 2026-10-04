// Mute lists (own + admins'), reports, featured pics and vote eligibility.
import { ADMINS, D, VOTE_MIN_ACCOUNT_DAYS } from '../../config'
import { query } from '../nostr/pool'
import { publish, updateList } from '../nostr/publish'
import { now, tagValues, toHex, type Event } from '../nostr/util'
import { vfs } from './profiles.svelte'
import { social } from './social.svelte'

export const admins: string[] = ADMINS.map(toHex).filter((x): x is string => !!x)
export const isAdmin = (pk: string | null | undefined) => !!pk && admins.includes(pk)

export const mod = $state({
  adminMuted: {} as Record<string, true>,
  myMuted: {} as Record<string, true>,
  adminFollows: {} as Record<string, true>,
  featured: [] as string[],
})

export async function loadAdminLists() {
  if (!admins.length) return
  const evs = await query({ kinds: [10000, 3, 30006], authors: admins })
  const muted: Record<string, true> = {}
  const follows: Record<string, true> = {}
  const featured: string[] = []
  for (const e of evs) {
    if (e.kind === 10000) tagValues(e, 'p').forEach((p) => (muted[p] = true))
    if (e.kind === 3) tagValues(e, 'p').forEach((p) => (follows[p] = true))
    if (e.kind === 30006 && e.tags.some((t) => t[0] === 'd' && t[1] === D.featured))
      tagValues(e, 'e').forEach((id) => featured.includes(id) || featured.push(id))
  }
  mod.adminMuted = muted
  mod.adminFollows = follows
  mod.featured = featured
}

export async function loadMyMutes(pubkey: string) {
  const evs = await query({ kinds: [10000], authors: [pubkey] })
  const m: Record<string, true> = {}
  if (evs[0]) tagValues(evs[0], 'p').forEach((p) => (m[p] = true))
  mod.myMuted = m
}

export const isHidden = (pk: string) => !!mod.adminMuted[pk] || !!mod.myMuted[pk]

export async function mute(me: string, target: string, on: boolean) {
  await updateList(10000, me, (tags) => {
    const rest = tags.filter((t) => !(t[0] === 'p' && t[1] === target))
    return on ? [...rest, ['p', target]] : rest
  })
  if (on) mod.myMuted[target] = true
  else delete mod.myMuted[target]
}

export const REPORT_TYPES = ['spam', 'nudity', 'profanity', 'illegal', 'impersonation', 'malware', 'other'] as const

export function report(type: (typeof REPORT_TYPES)[number], pubkey: string, event?: Event, note = '') {
  const tags: string[][] = [['p', pubkey, type]]
  if (event) tags.push(['e', event.id, type])
  return publish({ kind: 1984, content: note, tags })
}

export async function setFeatured(me: string, picId: string, on: boolean) {
  await updateList(
    30006,
    me,
    (tags) => {
      const rest = tags.filter((t) => !(t[0] === 'e' && t[1] === picId))
      return on ? [...rest, ['e', picId]] : rest
    },
    { d: D.featured, appTag: true },
  )
  mod.featured = on ? [...mod.featured.filter((x) => x !== picId), picId] : mod.featured.filter((x) => x !== picId)
}

/** Whether a voter's pic ratings count. */
export function voteEligible(pk: string) {
  if (isHidden(pk)) return false
  const p = vfs[pk]
  if (!p) return false
  if (isAdmin(pk) || mod.adminFollows[pk] || social.follows.includes(pk)) return true
  return now() - p.joined > VOTE_MIN_ACCOUNT_DAYS * 86400
}
