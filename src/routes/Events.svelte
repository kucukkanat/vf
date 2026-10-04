<script lang="ts">
  import Name from '../components/Name.svelte'
  import Loading from '../components/Loading.svelte'
  import { loadEvents, type CalEvent } from '../lib/models/events'
  import { isHidden } from '../lib/models/moderation.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { href } from '../lib/router.svelte'
  import { naddr, now } from '../lib/nostr/util'

  let events = $state<CalEvent[] | null>(null)
  let past = $state(false)
  loadEvents().then((e) => (events = e))
  let shown = $derived((events ?? []).filter((e) => !isHidden(e.pubkey) && (past ? e.end < now() : e.end >= now() - 86400)))
  const fmt = (ts: number) => new Date(ts * 1000).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<h1>Events</h1>
<div class="row" style="margin-bottom:8px">
  <div class="tabs" style="margin:0"><button class:on={!past} onclick={() => (past = false)}>Upcoming</button><button class:on={past} onclick={() => (past = true)}>Past</button></div>
  {#if session.pubkey}<a class="btn small" href={href('/event/new')}>+ Add event</a>{/if}
</div>
{#if !events}<Loading />{:else}
  <table class="list">
    <thead><tr><th>When</th><th>Event</th><th class="hide-m">Where</th></tr></thead>
    <tbody>
      {#each past ? [...shown].reverse() : shown as e (e.addr)}
        <tr>
          <td class="small" style="white-space:nowrap">{fmt(e.start)}</td>
          <td><a href={href('/event/' + naddr(31923, e.pubkey, e.d))}><b>{e.title}</b></a><br /><span class="small dim">posted by <Name pubkey={e.pubkey} /></span></td>
          <td class="hide-m">{e.location}</td>
        </tr>
      {:else}<tr><td colspan="3" class="dim">No events.</td></tr>{/each}
    </tbody>
  </table>
{/if}
