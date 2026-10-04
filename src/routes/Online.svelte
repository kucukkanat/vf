<script lang="ts">
  import UserCard from '../components/UserCard.svelte'
  import Loading from '../components/Loading.svelte'
  import { whoIsOnline } from '../lib/models/presence'
  import { isHidden } from '../lib/models/moderation.svelte'
  import { isMember, want } from '../lib/models/profiles.svelte'
  let list = $state<string[] | null>(null)
  whoIsOnline().then((o) => (o.forEach((p) => want(p)), (list = o)))
  let shown = $derived((list ?? []).filter((p) => !isHidden(p) && isMember(p)))
</script>

<h1>Who's online</h1>
{#if !list}<Loading />{:else if !shown.length}<p class="dim">Nobody is online right now.</p>
{:else}<div class="ugrid">{#each shown as p (p)}<UserCard pubkey={p} online />{/each}</div>{/if}
