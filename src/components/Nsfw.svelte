<script lang="ts">
  import type { Snippet } from 'svelte'
  import { canSeeNsfw, isAdult } from '../lib/prefs.svelte'
  import { href } from '../lib/router.svelte'
  let { reason, children }: { reason: string | null; children: Snippet } = $props()
  let revealed = $state(false)
  let show = $derived(!reason || canSeeNsfw() || (isAdult() && revealed))
</script>

{#if show}
  {@render children()}
{:else}
  <div class="warn center">
    <b>Content warning{reason && reason !== 'NSFW' ? `: ${reason}` : ' (NSFW)'}</b><br />
    {#if isAdult()}
      <button class="small" onclick={() => (revealed = true)}>Show it</button>
      <span class="dim small">or enable NSFW in <a href={href('/settings')}>settings</a></span>
    {:else}
      <span class="dim small">This content is only available to members 18 and older.</span>
    {/if}
  </div>
{/if}
