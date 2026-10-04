<script lang="ts">
  import { rate, type Pic, type Score } from '../lib/models/pics'
  import { session } from '../lib/auth/session.svelte'
  let { pic, score, onrated }: { pic: Pic; score?: Score; onrated?: (n: number) => void } = $props()
  let busy = $state(false)
  let error = $state('')
  async function vote(n: number) {
    busy = true
    error = ''
    try {
      await rate(pic, n)
      onrated?.(n)
    } catch (e: any) {
      error = e.message
    } finally {
      busy = false
    }
  }
</script>

<div class="center">
  <div style="font-size:14px;margin-bottom:4px">
    {#if score?.count}<b style="color:var(--green)">★ {score.avg.toFixed(2)}</b> <span class="dim">/ 10 from {score.count} vote{score.count === 1 ? '' : 's'}</span>
    {:else}<span class="dim">Not rated yet</span>{/if}
  </div>
  {#if session.pubkey && session.pubkey !== pic.pubkey}
    <div class="dim small">Rate this pic:</div>
    <div class="rate">
      {#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as n}
        <button class="small" class:mine={score?.mine === n} disabled={busy} onclick={() => vote(n)}>{n}</button>
      {/each}
    </div>
  {/if}
  {#if error}<div class="err">{error}</div>{/if}
</div>
