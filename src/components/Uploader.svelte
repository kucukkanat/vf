<script lang="ts">
  import { upload, type Blob } from '../lib/media/blossom'
  import { session } from '../lib/auth/session.svelte'
  let {
    accept = 'image/*',
    maxBytes,
    label = 'Choose file',
    onuploaded,
    onfile,
  }: { accept?: string; maxBytes: number; label?: string; onuploaded: (b: Blob, f: File) => void; onfile?: (f: File) => void } = $props()
  let status = $state('')
  let error = $state('')
  let busy = $state(false)

  async function pick(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const f = input.files?.[0]
    if (!f) return
    error = ''
    if (f.size > maxBytes) {
      error = `File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`
      return
    }
    onfile?.(f)
    busy = true
    try {
      const b = await upload(f, session.pubkey, (s) => (status = s))
      onuploaded(b, f)
    } catch (err: any) {
      error = err.message ?? String(err)
    } finally {
      busy = false
      status = ''
      input.value = ''
    }
  }
</script>

<div>
  <label class="btn alt small" style="display:inline-block;margin:0">
    {busy ? 'Uploading…' : label}
    <input type="file" {accept} onchange={pick} disabled={busy} style="display:none" />
  </label>
  {#if status}<span class="dim small">{status}</span>{/if}
  {#if error}<div class="err">{error}</div>{/if}
</div>
