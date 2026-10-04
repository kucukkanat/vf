<script lang="ts">
  import { metas, want } from '../lib/models/profiles.svelte'
  import { href } from '../lib/router.svelte'
  import { npub } from '../lib/nostr/util'

  let { pubkey, size = 50, link = true }: { pubkey: string; size?: number; link?: boolean } = $props()
  const DEFAULT =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><rect width="50" height="50" fill="#1c1c1c"/><circle cx="25" cy="19" r="9" fill="#3a3a3a"/><path d="M8 50c2-12 9-17 17-17s15 5 17 17z" fill="#3a3a3a"/><path d="M21 22l1 4 1-4M27 22l1 4 1-4" stroke="#fff" stroke-width="1"/></svg>`,
    )
  $effect(() => want(pubkey))
  let failed = $state(false)
  let src = $derived(!failed && metas[pubkey]?.picture ? metas[pubkey].picture : DEFAULT)
</script>

{#if link}
  <a href={href('/u/' + npub(pubkey))}>
    <img class="avatar" {src} alt="" width={size} height={size} style="width:{size}px;height:{size}px" loading="lazy" onerror={() => (failed = true)} />
  </a>
{:else}
  <img class="avatar" {src} alt="" width={size} height={size} style="width:{size}px;height:{size}px" loading="lazy" onerror={() => (failed = true)} />
{/if}
