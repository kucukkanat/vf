<script lang="ts">
  import { renderText } from '../lib/safety/sanitize'
  let { text }: { text: string } = $props()
  let html = $derived(renderText(text))
</script>

<div class="body">{@html html}</div>
