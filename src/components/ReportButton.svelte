<script lang="ts">
  import Modal from './Modal.svelte'
  import { REPORT_TYPES, report, mute, isAdmin } from '../lib/models/moderation.svelte'
  import { session } from '../lib/auth/session.svelte'
  import type { Event } from '../lib/nostr/util'
  let { pubkey, event, label = 'report' }: { pubkey: string; event?: Event; label?: string } = $props()
  let open = $state(false)
  let type = $state<(typeof REPORT_TYPES)[number]>('spam')
  let note = $state('')
  let alsoMute = $state(true)
  let done = $state('')
  let busy = $state(false)

  async function send() {
    busy = true
    try {
      await report(type, pubkey, event, note)
      if (alsoMute && session.pubkey) await mute(session.pubkey, pubkey, true)
      done = 'Reported. Thanks for keeping the crypt clean.'
    } catch (e: any) {
      done = 'Error: ' + e.message
    } finally {
      busy = false
    }
  }
</script>

<button class="link small" onclick={() => (open = true)}>{label}</button>
{#if open}
  <Modal title="Report" onclose={() => ((open = false), (done = ''))}>
    {#if done}
      <p>{done}</p>
    {:else}
      <label for="rt">Reason</label>
      <select id="rt" bind:value={type}>{#each REPORT_TYPES as t}<option value={t}>{t}</option>{/each}</select>
      <label for="rn">Details (optional)</label>
      <textarea id="rn" bind:value={note}></textarea>
      <label class="inline"><input type="checkbox" bind:checked={alsoMute} /> Also block this user {#if session.pubkey && isAdmin(session.pubkey)}(site-wide, you are an admin){/if}</label>
      <div class="row" style="margin-top:6px"><button onclick={send} disabled={busy}>Send report</button></div>
    {/if}
  </Modal>
{/if}
