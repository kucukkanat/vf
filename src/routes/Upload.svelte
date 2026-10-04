<script lang="ts">
  import { upload, imageSize, type Blob } from '../lib/media/blossom'
  import { postPic } from '../lib/models/pics'
  import { session } from '../lib/auth/session.svelte'
  import { isAdult } from '../lib/prefs.svelte'
  import { href, go } from '../lib/router.svelte'
  import { MAX_IMAGE_BYTES } from '../config'

  let file = $state<File | null>(null)
  let preview = $state('')
  let title = $state('')
  let desc = $state('')
  let nsfw = $state(false)
  let reason = $state('')
  let status = $state('')
  let error = $state('')
  let busy = $state(false)

  function pick(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0]
    error = ''
    if (!f) return
    if (!f.type.startsWith('image/')) return (error = 'Pick an image file')
    if (f.size > MAX_IMAGE_BYTES) return (error = `Max ${MAX_IMAGE_BYTES / 1024 / 1024} MB`)
    file = f
    preview = URL.createObjectURL(f)
  }
  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!file) return
    busy = true
    error = ''
    try {
      const dim = await imageSize(file)
      const blob: Blob = await upload(file, session.pubkey, (s) => (status = s))
      status = 'Publishing…'
      const ev = await postPic(blob, title.trim(), desc.trim(), nsfw ? reason.trim() : null, dim)
      go('/pic/' + ev.id)
    } catch (err: any) {
      error = err.message
    } finally {
      busy = false
      status = ''
    }
  }
</script>

{#if !session.pubkey}
  <p><a href={href('/login')}>Log in</a> to upload pics.</p>
{:else}
  <div class="box" style="max-width:640px;margin:0 auto">
    <div class="box-h"><span>Upload a pic</span></div>
    <div class="box-b">
      <form onsubmit={submit}>
        <input type="file" accept="image/*" onchange={pick} />
        {#if preview}<img src={preview} alt="" style="max-height:300px;display:block;margin:8px 0;border:1px solid #444" />{/if}
        <label for="t">Title</label><input id="t" bind:value={title} maxlength="120" />
        <label for="d">Description</label><textarea id="d" bind:value={desc} maxlength="2000"></textarea>
        <label class="inline" style="margin-top:6px"><input type="checkbox" bind:checked={nsfw} /> This pic is NSFW / needs a content warning</label>
        {#if nsfw}<input bind:value={reason} placeholder="Reason (optional): nudity, gore…" maxlength="60" />{/if}
        {#if !isAdult()}<p class="dim small">Members under 18 must not upload adult content.</p>{/if}
        <p class="dim small">Pics are stored on public Blossom servers and are visible to everyone. Don't upload anything you don't own.</p>
        {#if error}<div class="err">{error}</div>{/if}
        <div class="row"><button disabled={busy || !file}>{busy ? status || 'Working…' : 'Upload'}</button></div>
      </form>
    </div>
  </div>
{/if}
