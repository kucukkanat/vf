<script lang="ts">
  import Modal from './Modal.svelte'
  import { zapInvoice, payWithWebln } from '../lib/models/zaps'
  import { session } from '../lib/auth/session.svelte'
  import type { Event } from '../lib/nostr/util'
  let { pubkey, event, label = '⚡ Kudos' }: { pubkey: string; event?: Event; label?: string } = $props()
  let open = $state(false)
  let sats = $state(210)
  let comment = $state('')
  let invoice = $state('')
  let msg = $state('')
  let busy = $state(false)
  async function go() {
    busy = true
    msg = ''
    try {
      const pr = await zapInvoice(pubkey, sats, comment, event)
      if (await payWithWebln(pr)) msg = 'Zapped! ⚡'
      else invoice = pr
    } catch (e: any) {
      msg = 'Error: ' + e.message
    } finally {
      busy = false
    }
  }
</script>

{#if session.pubkey && session.pubkey !== pubkey}
  <button class="alt small" onclick={() => (open = true)}>{label}</button>
{/if}
{#if open}
  <Modal title="Send kudos (Lightning zap)" onclose={() => ((open = false), (invoice = ''), (msg = ''))}>
    {#if invoice}
      <p>Pay this invoice with any Lightning wallet:</p>
      <textarea readonly rows="4" onfocus={(e) => (e.currentTarget as HTMLTextAreaElement).select()}>{invoice}</textarea>
      <div class="row" style="margin-top:6px">
        <a class="btn" href={'lightning:' + invoice}>Open wallet</a>
        <button class="alt" onclick={() => navigator.clipboard.writeText(invoice)}>Copy</button>
      </div>
    {:else}
      <div class="row">{#each [21, 210, 1000, 5000] as s}<button class="small" class:alt={sats !== s} onclick={() => (sats = s)}>{s} sats</button>{/each}</div>
      <label for="zs">Amount (sats)</label>
      <input id="zs" type="number" min="1" bind:value={sats} />
      <label for="zc">Comment</label>
      <input id="zc" bind:value={comment} maxlength="200" />
      <div class="row" style="margin-top:6px"><button onclick={go} disabled={busy || sats < 1}>{busy ? 'Getting invoice…' : 'Zap'}</button></div>
    {/if}
    {#if msg}<p>{msg}</p>{/if}
  </Modal>
{/if}
