<script lang="ts">
  import Loading from '../components/Loading.svelte'
  import Name from '../components/Name.svelte'
  import { listCults, myCults, type Cult } from '../lib/models/cults'
  import { isHidden } from '../lib/models/moderation.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { href } from '../lib/router.svelte'
  import { naddr } from '../lib/nostr/util'

  let cults = $state<Cult[] | null>(null)
  let mine = $state<string[]>([])
  let q = $state('')
  listCults().then((c) => (cults = c))
  if (session.pubkey) myCults(session.pubkey).then((m) => (mine = m))
  let shown = $derived((cults ?? []).filter((c) => !isHidden(c.owner) && (!q || (c.name + c.description).toLowerCase().includes(q.toLowerCase()))))
</script>

<h1>Cults</h1>
<div class="row" style="margin-bottom:8px">
  <input type="search" placeholder="Search cults…" bind:value={q} style="max-width:260px" />
  {#if session.pubkey}<a class="btn small" href={href('/cult/new')}>Start a cult</a>{/if}
</div>
{#if !cults}<Loading />{:else if !shown.length}<p class="dim">No cults found.</p>{:else}
  <table class="list">
    <thead><tr><th></th><th>Cult</th><th class="hide-m">Leader</th></tr></thead>
    <tbody>
      {#each shown as c (c.addr)}
        <tr>
          <td style="width:56px">{#if c.image}<img src={c.image} alt="" style="width:50px;height:50px;object-fit:cover" />{/if}</td>
          <td><a href={href('/cult/' + naddr(34550, c.owner, c.d))}><b>{c.name}</b></a> {#if mine.includes(c.addr)}<span class="pill">member</span>{/if}<br /><span class="small">{c.description.slice(0, 200)}</span></td>
          <td class="hide-m"><Name pubkey={c.owner} /></td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
