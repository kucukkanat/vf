<script lang="ts">
  import UserCard from '../components/UserCard.svelte'
  import PicThumb from '../components/PicThumb.svelte'
  import Name from '../components/Name.svelte'
  import Loading from '../components/Loading.svelte'
  import { loadMembers, vfs, isMember, displayName } from '../lib/models/profiles.svelte'
  import { loadPics, loadRatings, aggregate, type Pic, type Score } from '../lib/models/pics'
  import { loadJournals, type Journal } from '../lib/models/journals'
  import { whoIsOnline } from '../lib/models/presence'
  import { isHidden, voteEligible, admins } from '../lib/models/moderation.svelte'
  import { loadEvents, type CalEvent } from '../lib/models/events'
  import { listCults, type Cult } from '../lib/models/cults'
  import { session } from '../lib/auth/session.svelte'
  import { href } from '../lib/router.svelte'
  import { naddr, npub, now, timeAgo } from '../lib/nostr/util'

  let members = $state<string[]>([])
  let online = $state<string[]>([])
  let pics = $state<Pic[]>([])
  let scores = $state<Record<string, Score>>({})
  let news = $state<Journal[]>([])
  let journals = $state<Journal[]>([])
  let events = $state<CalEvent[]>([])
  let cults = $state<Cult[]>([])
  let loading = $state(true)

  loadMembers(300).then((m) => ((members = m), (loading = false)))
  whoIsOnline().then((o) => (online = o))
  loadPics({ since: now() - 7 * 86400, limit: 150 }).then(async (p) => {
    pics = p
    const owners = Object.fromEntries(p.map((x) => [x.id, x.pubkey]))
    scores = aggregate(await loadRatings(p.map((x) => x.id)), voteEligible, session.pubkey, owners)
  })
  if (admins.length) loadJournals({ news: true, authors: admins, limit: 5 }).then((n) => (news = n))
  loadJournals({ limit: 20 }).then((j) => (journals = j))
  loadEvents().then((e) => (events = e.filter((x) => x.end >= now() - 86400).slice(0, 5)))
  listCults().then((c) => (cults = c.slice(0, 8)))

  const ok = (pk: string) => !isHidden(pk) && isMember(pk)
  let newest = $derived(members.filter(ok).sort((a, b) => (vfs[b]?.joined ?? 0) - (vfs[a]?.joined ?? 0)).slice(0, 12))
  let onlineMembers = $derived(online.filter(ok))
  let topPics = $derived(pics.filter((p) => ok(p.pubkey) && (scores[p.id]?.count ?? 0) >= 1).sort((a, b) => scores[b.id].avg - scores[a.id].avg).slice(0, 8))
  let newPics = $derived(pics.filter((p) => ok(p.pubkey)).slice(0, 8))
  let latestJournals = $derived(journals.filter((j) => ok(j.pubkey)).slice(0, 8))
</script>

<div class="cols-r">
  <div>
    {#if news.length}
      <div class="box"><div class="box-h"><span>Site news</span></div><div class="box-b">
        {#each news as n}<div style="margin-bottom:6px"><a href={href('/j/' + naddr(30023, n.pubkey, n.d))}><b>{n.title}</b></a> <span class="dim small">{timeAgo(n.published)}</span><br /><span class="small">{n.summary}</span></div>{/each}
      </div></div>
    {/if}
    <div class="box"><div class="box-h"><span>Hottest pics this week</span><a href={href('/pics/top')}>more »</a></div><div class="box-b">
      {#if topPics.length}<div class="pgrid">{#each topPics as p (p.id)}<PicThumb pic={p} score={scores[p.id]} />{/each}</div>
      {:else}<p class="dim">No rated pics yet this week.</p>{/if}
    </div></div>
    <div class="box"><div class="box-h"><span>Newest members</span><a href={href('/members')}>search »</a></div><div class="box-b">
      {#if loading}<Loading />{:else}<div class="ugrid">{#each newest as p (p)}<UserCard pubkey={p} size={64} online={online.includes(p)} />{/each}</div>{/if}
    </div></div>
    <div class="box"><div class="box-h"><span>Fresh pics</span><a href={href('/pics')}>more »</a></div><div class="box-b">
      {#if newPics.length}<div class="pgrid">{#each newPics as p (p.id)}<PicThumb pic={p} />{/each}</div>{:else}<p class="dim">No pics yet.</p>{/if}
    </div></div>
  </div>

  <div>
    <div class="box"><div class="box-h"><span>Online now ({onlineMembers.length})</span><a href={href('/online')}>all »</a></div><div class="box-b">
      {#if !onlineMembers.length}<p class="dim small">Nobody… it's quiet in the crypt.</p>{/if}
      {#each onlineMembers.slice(0, 15) as p}<div><span class="online-dot"></span> <Name pubkey={p} /></div>{/each}
    </div></div>
    <div class="box"><div class="box-h"><span>Cults</span><a href={href('/cults')}>all »</a></div><div class="box-b">
      {#each cults as c}<div>» <a href={href('/cult/' + naddr(34550, c.owner, c.d))}>{c.name}</a></div>{:else}<p class="dim small">No cults yet. <a href={href('/cult/new')}>Start one</a>.</p>{/each}
    </div></div>
    <div class="box"><div class="box-h"><span>Latest journals</span><a href={href('/journals')}>all »</a></div><div class="box-b">
      {#each latestJournals as j (j.id)}
        <div style="margin-bottom:5px"><a href={href('/j/' + naddr(30023, j.pubkey, j.d))}>{j.title}</a><br /><span class="small dim">by {displayName(j.pubkey)} · {timeAgo(j.published)}</span></div>
      {:else}<p class="dim small">Nothing yet.</p>{/each}
    </div></div>
    <div class="box"><div class="box-h"><span>Upcoming events</span><a href={href('/events')}>all »</a></div><div class="box-b">
      {#each events as e}<div style="margin-bottom:5px"><a href={href('/event/' + naddr(31923, e.pubkey, e.d))}>{e.title}</a><br /><span class="small dim">{new Date(e.start * 1000).toLocaleDateString()} · {e.location}</span></div>
      {:else}<p class="dim small">No upcoming events. <a href={href('/event/new')}>Add one</a>.</p>{/each}
    </div></div>
    <div class="box"><div class="box-h"><span>Stats</span></div><div class="box-b small">
      <table class="kv"><tbody><tr><td>Members:</td><td>{members.length}</td></tr><tr><td>Online:</td><td>{onlineMembers.length}</td></tr><tr><td>Pics this week:</td><td>{pics.filter((p) => ok(p.pubkey)).length}</td></tr></tbody></table>
    </div></div>
  </div>
</div>
