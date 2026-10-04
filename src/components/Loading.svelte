<script lang="ts">
  let { text = 'Summoning data from the relays' }: { text?: string } = $props()
</script>

<div class="loading">{text}<span class="blink">...</span></div>
