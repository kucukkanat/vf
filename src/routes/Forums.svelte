<script lang="ts">
  import { FORUM_BOARDS } from '../config'
  import { href } from '../lib/router.svelte'
</script>

<h1>Forums</h1>
<table class="list">
  <thead><tr><th>Board</th><th class="hide-m">Description</th></tr></thead>
  <tbody>
    {#each FORUM_BOARDS as b}
      <tr><td><a href={href('/forums/' + b.id)}><b>{b.name}</b></a></td><td class="hide-m">{b.desc}</td></tr>
    {/each}
  </tbody>
</table>
<p class="dim small">Want a private community? <a href={href('/cults')}>Start a cult</a>.</p>
