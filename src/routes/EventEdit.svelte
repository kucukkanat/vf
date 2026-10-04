<script lang="ts">
  import Uploader from '../components/Uploader.svelte'
  import { loadEvent, saveEvent } from '../lib/models/events'
  import { session } from '../lib/auth/session.svelte'
  import { go, href } from '../lib/router.svelte'
  import { naddr } from '../lib/nostr/util'
  import { MAX_IMAGE_BYTES } from '../config'

  let { d }: { d?: string } = $props()
  const toLocal = (ts: number) => {
    const dt = new Date(ts * 1000)
    return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }
  let f = $state({ title: '', summary: '', description: '', image: '', location: '', start: '', end: '' })
  let error = $state('')
  let busy = $state(false)
  if (d && session.pubkey)
    loadEvent(session.pubkey, decodeURIComponent(d)).then((e) => {
      if (e) f = { title: e.title, summary: e.summary, description: e.description, image: e.image, location: e.location, start: toLocal(e.start), end: toLocal(e.end) }
    })

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    const start = Math.floor(new Date(f.start).getTime() / 1000)
    const end = f.end ? Math.floor(new Date(f.end).getTime() / 1000) : start + 4 * 3600
    if (!f.title.trim() || !start) return (error = 'Title and start time required')
    busy = true
    error = ''
    try {
      const ev = await saveEvent({ d: d ? decodeURIComponent(d) : undefined, title: f.title.trim(), summary: f.summary.trim(), description: f.description, image: f.image, location: f.location.trim(), start, end })
      go('/event/' + naddr(31923, ev.pubkey, ev.tags.find((t) => t[0] === 'd')![1]))
    } catch (err: any) {
      error = err.message
    } finally {
      busy = false
    }
  }
</script>

{#if !session.pubkey}<p><a href={href('/login')}>Log in</a> first.</p>
{:else}
  <form class="box" style="max-width:640px;margin:0 auto" onsubmit={submit}>
    <div class="box-h"><span>{d ? 'Edit event' : 'Add an event'}</span></div>
    <div class="box-b">
      <label for="t">Title</label><input id="t" bind:value={f.title} maxlength="200" placeholder="Bat Cave Night @ The Crypt" />
      <div class="row">
        <div class="grow"><label for="s">Starts</label><input id="s" type="datetime-local" bind:value={f.start} /></div>
        <div class="grow"><label for="e">Ends</label><input id="e" type="datetime-local" bind:value={f.end} /></div>
      </div>
      <label for="l">Location</label><input id="l" bind:value={f.location} maxlength="200" />
      <label for="su">Summary</label><input id="su" bind:value={f.summary} maxlength="300" />
      <label for="d">Description (Markdown)</label><textarea id="d" bind:value={f.description} rows="6"></textarea>
      <span class="label">Flyer</span>
      <div class="row"><input class="grow" bind:value={f.image} placeholder="https://…" style="width:auto" /><Uploader maxBytes={MAX_IMAGE_BYTES} label="Upload" onuploaded={(b) => (f.image = b.url)} /></div>
      {#if error}<div class="err">{error}</div>{/if}
      <div class="row" style="margin-top:8px"><button disabled={busy}>{busy ? 'Saving…' : 'Save event'}</button></div>
    </div>
  </form>
{/if}
