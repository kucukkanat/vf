<script lang="ts">
  import { displayName } from '../lib/models/profiles.svelte'
  import { href } from '../lib/router.svelte'
  import { npub } from '../lib/nostr/util'
  let { pubkey }: { pubkey: string } = $props()
</script>

<a href={href('/u/' + npub(pubkey))} class="name"><b>{displayName(pubkey)}</b></a>
