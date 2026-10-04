<script lang="ts">
  import type { Snippet } from 'svelte'
  let { title, onclose, children }: { title: string; onclose: () => void; children: Snippet } = $props()
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="modal-bg" onclick={(e) => e.target === e.currentTarget && onclose()}>
  <div class="modal" role="dialog" aria-label={title}>
    <div class="box-h"><span>{title}</span><button class="link" onclick={onclose} aria-label="Close">[x]</button></div>
    <div class="box-b">{@render children()}</div>
  </div>
</div>
