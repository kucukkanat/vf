<script lang="ts">
  import Avatar from './Avatar.svelte'
  import Name from './Name.svelte'
  import { vfs } from '../lib/models/profiles.svelte'
  let { pubkey, size = 70, online = false }: { pubkey: string; size?: number; online?: boolean } = $props()
</script>

<div class="ucard">
  <Avatar {pubkey} {size} />
  <span class="nm">{#if online}<span class="online-dot"></span> {/if}<Name {pubkey} /></span>
  {#if vfs[pubkey]?.location}<span class="dim small">{vfs[pubkey].location}</span>{/if}
</div>
