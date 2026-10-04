<script lang="ts">
  import { prefs } from '../lib/prefs.svelte'
  let { url, title }: { url: string; title: string } = $props()
</script>

<div class="player">
  <span title="Now playing">♫</span>
  <span class="dim small" style="max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{title}</span>
  <audio src={url} controls preload="none" autoplay={prefs.autoplaySongs}></audio>
</div>
