<script lang="ts">
  import CommentSection from '../components/CommentSection.svelte'
  import Markdown from '../components/Markdown.svelte'
  import Name from '../components/Name.svelte'
  import UserCard from '../components/UserCard.svelte'
  import Loading from '../components/Loading.svelte'
  import { loadEvent, loadRsvps, rsvp, type CalEvent, type RSVP } from '../lib/models/events'
  import { targetOf } from '../lib/models/comments'
  import { isHidden } from '../lib/models/moderation.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { deleteEvents } from '../lib/nostr/publish'
  import { href, go } from '../lib/router.svelte'
  import { decodeNaddr, fmtDate } from '../lib/nostr/util'

  let { naddr }: { naddr: string } = $props()
  const a = decodeNaddr(naddr)
  let ev = $state<CalEvent | null>(null)
  let rsvps = $state<Record<string, RSVP>>({})
  let loading = $state(true)
  let busy = $state(false)
  async function load() {
    if (!a) return (loading = false)
    ev = await loadEvent(a.pubkey, a.identifier)
    loading = false
    if (ev) rsvps = await loadRsvps(ev)
  }
  load()
  async function set(s: RSVP) {
    busy = true
    try {
      await rsvp(ev!, s)
      rsvps = { ...rsvps, [session.pubkey!]: s }
    } finally {
      busy = false
    }
  }
  async function del() {
    if (!ev || !confirm('Delete this event?')) return
    await deleteEvents([ev.event])
    go('/events')
  }
  const who = (s: RSVP) => Object.entries(rsvps).filter(([pk, v]) => v === s && !isHidden(pk)).map(([pk]) => pk)
  let mine = $derived(session.pubkey ? rsvps[session.pubkey] : undefined)
</script>

{#if loading}<Loading />
{:else if !ev}<div class="err">Event not found.</div>
{:else}
  <div class="cols-r">
    <div>
      <div class="box"><div class="box-h"><span>{ev.title}</span></div><div class="box-b">
        {#if ev.image}<img src={ev.image} alt="" style="max-height:300px;display:block;margin-bottom:8px" />{/if}
        <table class="kv"><tbody>
          <tr><td>Starts:</td><td>{fmtDate(ev.start)}</td></tr>
          <tr><td>Ends:</td><td>{fmtDate(ev.end)}</td></tr>
          <tr><td>Where:</td><td>{ev.location}</td></tr>
          <tr><td>Posted by:</td><td><Name pubkey={ev.pubkey} /></td></tr>
        </tbody></table>
        {#if ev.summary}<p><b>{ev.summary}</b></p>{/if}
        <Markdown text={ev.description} />
        {#if session.pubkey === ev.pubkey}<div class="row"><a class="btn small" href={href('/event/edit/' + encodeURIComponent(ev.d))}>Edit</a><button class="small alt" onclick={del}>Delete</button></div>{/if}
      </div></div>
      <CommentSection target={targetOf(ev.event)} title="Wall" />
    </div>
    <div>
      {#if session.pubkey}
        <div class="box"><div class="box-h"><span>Are you going?</span></div><div class="box-b row">
          <button class:alt={mine !== 'accepted'} disabled={busy} onclick={() => set('accepted')}>Going</button>
          <button class:alt={mine !== 'tentative'} disabled={busy} onclick={() => set('tentative')}>Maybe</button>
          <button class:alt={mine !== 'declined'} disabled={busy} onclick={() => set('declined')}>Can't go</button>
        </div></div>
      {/if}
      <div class="box"><div class="box-h"><span>Going ({who('accepted').length})</span></div><div class="box-b"><div class="ugrid">{#each who('accepted') as p (p)}<UserCard pubkey={p} size={44} />{/each}</div></div></div>
      <div class="box"><div class="box-h"><span>Maybe ({who('tentative').length})</span></div><div class="box-b"><div class="ugrid">{#each who('tentative') as p (p)}<UserCard pubkey={p} size={44} />{/each}</div></div></div>
    </div>
  </div>
{/if}
