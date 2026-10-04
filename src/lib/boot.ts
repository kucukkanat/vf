// App startup: cache hydration, session restore and per-login data loading.
import { hydrate } from './nostr/cache'
import { query, setUserRelays } from './nostr/pool'
import { tags as tagsOf } from './nostr/util'
import { hydrateProfiles, refreshProfile } from './models/profiles.svelte'
import { loadAdminLists, loadMyMutes } from './models/moderation.svelte'
import { loadMyFollows } from './models/social.svelte'
import { startPresence, stopPresence } from './models/presence'
import { onLogin, restoreSession, session } from './auth/session.svelte'

export async function loadRelayList(pubkey: string) {
  const [e] = await query({ kinds: [10002], authors: [pubkey] }, { maxWait: 3000 })
  if (!e) return []
  const write = tagsOf(e, 'r').filter((t) => !t[2] || t[2] === 'write').map((t) => t[1])
  setUserRelays(write)
  return write
}

export async function boot() {
  await hydrate()
  hydrateProfiles()
  onLogin(async (pk) => {
    await loadRelayList(pk)
    refreshProfile(pk)
    loadMyFollows(pk)
    loadMyMutes(pk)
    startPresence()
  })
  loadAdminLists()
  await restoreSession()
  document.addEventListener('visibilitychange', () => {
    if (!session.pubkey) return
    if (document.visibilityState === 'visible') startPresence()
    else stopPresence()
  })
}
