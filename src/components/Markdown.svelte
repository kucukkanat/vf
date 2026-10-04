<script lang="ts">
  import { renderMarkdown } from '../lib/safety/sanitize'
  let { text }: { text: string } = $props()
  let html = $derived(renderMarkdown(text))
</script>

<div class="prose">{@html html}</div>
