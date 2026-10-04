<script lang="ts">
  import Markdown from '../components/Markdown.svelte'
  import Uploader from '../components/Uploader.svelte'
  import { loadJournal, saveJournal } from '../lib/models/journals'
  import { isAdmin } from '../lib/models/moderation.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { go, href, route } from '../lib/router.svelte'
  import { naddr } from '../lib/nostr/util'
  import { MAX_IMAGE_BYTES } from '../config'

  let { d }: { d?: string } = $props()
  let f = $state({ title: '', body: '', summary: '', image: '', mood: '', music: '', topics: '', nsfw: false, news: route.query.get('news') === '1', published: 0 })
  let preview = $state(false)
  let error = $state('')
  let busy = $state(false)

  if (d && session.pubkey)
    loadJournal(session.pubkey, decodeURIComponent(d)).then((j) => {
      if (j) f = { title: j.title, body: j.body, summary: j.summary, image: j.image, mood: j.mood, music: j.music, topics: j.topics.join(', '), nsfw: !!j.nsfw, news: j.event.tags.some((t) => t[0] === 't' && t[1] === 'vf-news'), published: j.published }
    })

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!f.title.trim() || !f.body.trim()) return (error = 'Title and text are required')
    busy = true
    error = ''
    try {
      const ev = await saveJournal({
        d: d ? decodeURIComponent(d) : undefined,
        title: f.title.trim(), body: f.body, summary: f.summary.trim(), image: f.image, mood: f.mood.trim(), music: f.music.trim(),
        topics: f.topics.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8),
        nsfw: f.nsfw ? '' : null, news: f.news && isAdmin(session.pubkey), published: f.published || undefined,
      })
      go('/j/' + naddr(30023, ev.pubkey, ev.tags.find((t) => t[0] === 'd')![1]))
    } catch (err: any) {
      error = err.message
    } finally {
      busy = false
    }
  }
</script>

{#if !session.pubkey}
  <p><a href={href('/login')}>Log in</a> to write in your journal.</p>
{:else}
  <form onsubmit={submit} class="box">
    <div class="box-h"><span>{d ? 'Edit journal entry' : 'New journal entry'}</span></div>
    <div class="box-b">
      <label for="t">Title</label><input id="t" bind:value={f.title} maxlength="200" />
      <div class="row">
        <div class="grow"><label for="m">Current mood</label><input id="m" bind:value={f.mood} maxlength="60" placeholder="gloomy" /></div>
        <div class="grow"><label for="mu">Listening to</label><input id="mu" bind:value={f.music} maxlength="120" placeholder="Artist - Song" /></div>
      </div>
      <div class="tabs" style="margin-top:8px"><button type="button" class:on={!preview} onclick={() => (preview = false)}>Write</button><button type="button" class:on={preview} onclick={() => (preview = true)}>Preview</button></div>
      {#if preview}<div style="min-height:200px"><Markdown text={f.body} /></div>
      {:else}<textarea bind:value={f.body} rows="16" placeholder="Pour your heart out… (Markdown supported)"></textarea>{/if}
      <label for="s">Summary (optional)</label><input id="s" bind:value={f.summary} maxlength="300" />
      <label for="tp">Tags (comma separated)</label><input id="tp" bind:value={f.topics} placeholder="poetry, music" />
      <span class="label">Header image (optional)</span>
      <div class="row"><input class="grow" bind:value={f.image} placeholder="https://…" style="width:auto" /><Uploader maxBytes={MAX_IMAGE_BYTES} label="Upload" onuploaded={(b) => (f.image = b.url)} /></div>
      <label class="inline" style="margin-top:6px"><input type="checkbox" bind:checked={f.nsfw} /> Content warning</label>
      {#if isAdmin(session.pubkey)}<label class="inline"><input type="checkbox" bind:checked={f.news} /> Post as site news</label>{/if}
      {#if error}<div class="err">{error}</div>{/if}
      <div class="row" style="margin-top:8px"><button disabled={busy}>{busy ? 'Publishing…' : 'Publish'}</button></div>
    </div>
  </form>
{/if}
