<script lang="ts">
  import PicThumb from '../components/PicThumb.svelte'
  import Loading from '../components/Loading.svelte'
  import { loadPics, loadRatings, aggregate, type Pic, type Score } from '../lib/models/pics'
  import { voteEligible, isHidden, mod } from '../lib/models/moderation.svelte'
  import { displayName, isMember, want } from '../lib/models/profiles.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { prefs } from '../lib/prefs.svelte'
  import { href } from '../lib/router.svelte'
  import { now, npub, toHex } from '../lib/nostr/util'

  let { tab = 'new', author }: { tab?: string; author?: string } = $props()
  const pk = author ? toHex(author) : null
  let pics = $state<Pic[]>([])
  let scores = $state<Record<string, Score>>({})
  let loading = $state(true)

  async function load() {
    loading = true
    let list: Pic[]
    if (pk) list = await loadPics({ authors: [pk], limit: 200 })
    else if (tab === 'featured') list = mod.featured.length ? await loadPics({ ids: mod.featured.slice(-100) }) : []
    else if (tab === 'top') list = await loadPics({ since: now() - 30 * 86400, limit: 300 })
    else list = await loadPics({ limit: 120 })
    list.forEach((p) => want(p.pubkey))
    pics = list
    loading = false
    const ratings = await loadRatings(list.map((p) => p.id))
    const owners = Object.fromEntries(list.map((p) => [p.id, p.pubkey]))
    scores = aggregate(ratings, voteEligible, session.pubkey, owners)
  }
  load()

  let shown = $derived.by(() => {
    let l = pics.filter((p) => !isHidden(p.pubkey) && (pk || prefs.showAllNostr || isMember(p.pubkey)))
    if (tab === 'top' && !pk) l = l.filter((p) => (scores[p.id]?.count ?? 0) >= 2).sort((a, b) => scores[b.id].avg - scores[a.id].avg)
    return l
  })
</script>

{#if pk}
  <h1>{displayName(pk)}'s pics</h1>
  <div class="row" style="margin-bottom:8px">
    <a href={href('/u/' + npub(pk))}>« back to profile</a>
    {#if pk === session.pubkey}<a class="btn small" href={href('/upload')}>Upload a pic</a>{/if}
  </div>
{:else}
  <h1>Pics</h1>
  <div class="tabs">
    <a href={href('/pics')} class:on={tab === 'new'}>Newest</a>
    <a href={href('/pics/top')} class:on={tab === 'top'}>Top rated (30 days)</a>
    <a href={href('/pics/featured')} class:on={tab === 'featured'}>Featured</a>
    {#if session.pubkey}<a href={href('/upload')}>+ Upload</a>{/if}
  </div>
{/if}

{#if loading}
  <Loading />
{:else if !shown.length}
  <p class="dim">{tab === 'top' ? 'No pics with enough votes yet. Go rate some!' : 'No pics here yet.'}</p>
{:else}
  <div class="pgrid">
    {#each shown as p (p.id)}
      <div>
        <PicThumb pic={p} score={scores[p.id]} />
        {#if !pk}<div class="small" style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis">by <a href={href('/u/' + npub(p.pubkey))}>{displayName(p.pubkey)}</a></div>{/if}
      </div>
    {/each}
  </div>
{/if}
