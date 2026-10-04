// Mute lists (own + admins'), reports, featured pics and vote eligibility.
import { ADMINS, D, SUPERADMINS, VOTE_MIN_ACCOUNT_DAYS } from '../../config'
import { query } from '../nostr/pool'
import { publish, updateList } from '../nostr/publish'
import { now, tag, tagValues, toHex, uniq, type Event } from '../nostr/util'
import { vfs } from './profiles.svelte'
import { social } from './social.svelte'

const hexList = (l: string[]) => l.map(toHex).filter((x): x is string => !!x)
export const superadmins: string[] = hexList(SUPERADMINS)
const staticAdmins = uniq([...superadmins, ...hexList(ADMINS)])

export const mod = $state({
  /** Super admins + build-time admins + admins appointed by a super admin. */
  admins: staticAdmins as string[],
  appointed: [] as string[],
  adminMuted: {} as Record<string, true>,
  myMuted: {} as Record<string, true>,
  adminFollows: {} as Record<string, true>,
  featured: [] as string[],
})

export const isSuperAdmin = (pk: string | null | undefined) => !!pk && superadmins.includes(pk)
export const isAdmin = (pk: string | null | undefined) => !!pk && mod.admins.includes(pk)

/** Loads the admin roster appointed by super admins (newest list per super admin). */
async function loadAppointed() {
  if (!superadmins.length) return
  const evs = await query({ kinds: [30000], authors: superadmins, '#d': [D.admins] })
  const latest = new Map<string, Event>()
  for (const e of evs) if (tag(e, 'd') === D.admins && (!latest.has(e.pubkey) || latest.get(e.pubkey)!.created_at < e.created_at)) latest.set(e.pubkey, e)
  mod.appointed = uniq([...latest.values()].flatMap((e) => tagValues(e, 'p')).map(toHex).filter((x): x is string => !!x))
  mod.admins = uniq([...staticAdmins, ...mod.appointed])
}

export async function setAdmin(me: string, target: string, on: boolean) {
  if (!isSuperAdmin(me)) throw new Error('Only super admins can appoint admins')
  await updateList(
    30000,
    me,
    (tags) => {
      const rest = tags.filter((t) => !(t[0] === 'p' && t[1] === target))
      return on ? [...rest, ['p', target]] : rest
    },
    { d: D.admins, appTag: true },
  )
  await loadAppointed()
}

export async function loadAdminLists() {
  await loadAppointed()
  const admins = mod.admins
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
