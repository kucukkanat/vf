<script lang="ts">
  import Uploader from '../components/Uploader.svelte'
  import { loadCult, saveCult } from '../lib/models/cults'
  import { session } from '../lib/auth/session.svelte'
  import { go, href } from '../lib/router.svelte'
  import { naddr, npub, toHex } from '../lib/nostr/util'
  import { MAX_IMAGE_BYTES } from '../config'

  let { d }: { d?: string } = $props()
  let f = $state({ name: '', description: '', image: '', rules: '', mods: '' })
  let error = $state('')
  let busy = $state(false)
  if (d && session.pubkey)
    loadCult(session.pubkey, decodeURIComponent(d)).then((c) => {
      if (c) f = { name: c.name, description: c.description, image: c.image, rules: c.rules, mods: c.moderators.filter((m) => m !== c.owner).map(npub).join('\n') }
    })

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!f.name.trim()) return (error = 'Name required')
    const mods = f.mods.split(/[\s,]+/).filter(Boolean).map(toHex)
    if (mods.some((m) => !m)) return (error = 'One of the moderator npubs is invalid')
    busy = true
    error = ''
    try {
      const ev = await saveCult({ d: d ? decodeURIComponent(d) : undefined, name: f.name.trim(), description: f.description.trim(), image: f.image, rules: f.rules.trim(), moderators: [session.pubkey!, ...(mods as string[])] })
      go('/cult/' + naddr(34550, ev.pubkey, ev.tags.find((t) => t[0] === 'd')![1]))
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
    <div class="box-h"><span>{d ? 'Edit cult' : 'Start a cult'}</span></div>
    <div class="box-b">
      <label for="n">Cult name</label><input id="n" bind:value={f.name} maxlength="80" disabled={!!d} />
      <label for="ds">Description</label><textarea id="ds" bind:value={f.description} maxlength="2000"></textarea>
      <label for="r">Rules</label><textarea id="r" bind:value={f.rules} maxlength="2000"></textarea>
      <span class="label">Image</span>
      <div class="row"><input class="grow" bind:value={f.image} placeholder="https://…" style="width:auto" /><Uploader maxBytes={MAX_IMAGE_BYTES} label="Upload" onuploaded={(b) => (f.image = b.url)} /></div>
      <label for="m">Extra moderators (npubs, one per line)</label><textarea id="m" bind:value={f.mods}></textarea>
      {#if error}<div class="err">{error}</div>{/if}
      <div class="row" style="margin-top:8px"><button disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
    </div>
  </form>
{/if}
