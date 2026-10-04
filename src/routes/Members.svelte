<script lang="ts">
  import UserCard from '../components/UserCard.svelte'
  import Loading from '../components/Loading.svelte'
  import { loadMembers, vfs, metas } from '../lib/models/profiles.svelte'
  import { isHidden } from '../lib/models/moderation.svelte'
  import { whoIsOnline } from '../lib/models/presence'
  import { search } from '../lib/nostr/pool'
  import { SCENES } from '../config'

  let all = $state<string[]>([])
  let online = $state<string[]>([])
  let loading = $state(true)
  let q = $state('')
  let scene = $state('')
  let loc = $state('')
  let gender = $state('')
  let onlyOnline = $state(false)
  let sort = $state<'new' | 'name'>('new')
  let remote = $state<string[] | null>(null)
  let searching = $state(false)

  loadMembers(1000).then((m) => ((all = m), (loading = false)))
  whoIsOnline().then((o) => (online = o))

  async function deepSearch() {
    if (!q.trim()) return
    searching = true
    const evs = await search({ kinds: [0], search: q.trim(), limit: 100 })
    remote = evs.map((e) => e.pubkey).filter((p) => vfs[p])
    searching = false
  }

  let results = $derived.by(() => {
    const needle = q.trim().toLowerCase()
    let l = all.filter((p) => vfs[p] && !isHidden(p))
    if (needle) l = l.filter((p) => {
      const m = metas[p]
      return [m?.name, m?.display_name, m?.about, vfs[p].headline, vfs[p].bands].some((s) => s?.toLowerCase().includes(needle)) || (remote ?? []).includes(p)
    })
    if (scene) l = l.filter((p) => vfs[p].scenes.includes(scene))
    if (loc.trim()) l = l.filter((p) => vfs[p].location.toLowerCase().includes(loc.trim().toLowerCase()))
    if (gender.trim()) l = l.filter((p) => vfs[p].gender.toLowerCase().startsWith(gender.trim().toLowerCase()))
    if (onlyOnline) l = l.filter((p) => online.includes(p))
    if (sort === 'name') l = [...l].sort((a, b) => (metas[a]?.name ?? '~').localeCompare(metas[b]?.name ?? '~'))
    else l = [...l].sort((a, b) => vfs[b].joined - vfs[a].joined)
    return l
  })
</script>

<h1>Member search</h1>
<div class="box"><div class="box-b">
  <div class="row">
    <input class="grow" type="search" placeholder="Name, bands, headline…" bind:value={q} style="width:auto" onkeydown={(e) => e.key === 'Enter' && deepSearch()} />
    <button class="small alt" onclick={deepSearch} disabled={searching}>{searching ? 'Searching…' : 'Deep search'}</button>
  </div>
  <div class="row" style="margin-top:6px">
    <select bind:value={scene} style="width:auto"><option value="">any scene</option>{#each SCENES as s}<option>{s}</option>{/each}</select>
    <input placeholder="location" bind:value={loc} style="width:130px" />
    <input placeholder="gender" bind:value={gender} style="width:90px" />
    <label class="inline"><input type="checkbox" bind:checked={onlyOnline} /> online now</label>
    <select bind:value={sort} style="width:auto"><option value="new">newest</option><option value="name">name</option></select>
  </div>
</div></div>
{#if loading}<Loading />{:else}
  <p class="dim">{results.length} freak{results.length === 1 ? '' : 's'} found</p>
  <div class="ugrid">{#each results.slice(0, 300) as p (p)}<UserCard pubkey={p} online={online.includes(p)} />{/each}</div>
{/if}
