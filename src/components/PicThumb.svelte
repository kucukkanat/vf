<script lang="ts">
  import type { Pic, Score } from '../lib/models/pics'
  import { canSeeNsfw } from '../lib/prefs.svelte'
  import { href } from '../lib/router.svelte'
  let { pic, score }: { pic: Pic; score?: Score } = $props()
  let blur = $derived(!!pic.nsfw && !canSeeNsfw())
  let src = $state('')
  $effect(() => {
    src = pic.url
  })
  function fallback() {
    const next = pic.fallbacks.find((f) => f !== src && !tried.includes(f))
    if (next) {
      tried.push(next)
      src = next
    }
  }
  const tried: string[] = []
</script>

<a class="pthumb" class:nsfw-blur={blur} href={href('/pic/' + pic.id)} title={pic.title}>
  <img {src} alt={pic.title} loading="lazy" onerror={fallback} />
  {#if blur}<span class="nsfw-label">NSFW<br />18+</span>{/if}
  {#if score}
    <span class="score">{score.count ? `★ ${score.avg.toFixed(1)} (${score.count})` : 'not rated'}</span>
  {/if}
</a>
