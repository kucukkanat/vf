<script lang="ts">
  import type { Snippet } from 'svelte'
  let { title, more, children, actions }: { title: string; more?: { href: string; label: string }; children: Snippet; actions?: Snippet } = $props()
</script>

<div class="box">
  <div class="box-h">
    <span>{title}</span>
    <span>{#if actions}{@render actions()}{/if}{#if more}<a href={more.href}>{more.label}</a>{/if}</span>
  </div>
  <div class="box-b">{@render children()}</div>
</div>
