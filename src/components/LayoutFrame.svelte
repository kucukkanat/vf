<script lang="ts">
  let { srcdoc }: { srcdoc: string } = $props()
  let frame: HTMLIFrameElement
  let height = $state(600)
  let ro: ResizeObserver | null = null

  function measure() {
    try {
      const doc = frame.contentDocument
      if (!doc?.body) return
      height = Math.max(300, doc.documentElement.scrollHeight)
      ro?.disconnect()
      ro = new ResizeObserver(() => (height = Math.max(300, doc.documentElement.scrollHeight)))
      ro.observe(doc.body)
      doc.querySelectorAll('img').forEach((img) => img.addEventListener('load', () => (height = Math.max(300, doc.documentElement.scrollHeight))))
    } catch {}
  }
  $effect(() => () => ro?.disconnect())
</script>

<!-- No allow-scripts: same-origin is only granted so the parent can measure the height. -->
<iframe
  bind:this={frame}
  class="layout-frame"
  title="Profile"
  sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
  referrerpolicy="no-referrer"
  {srcdoc}
  style="height:{height}px"
  onload={measure}
></iframe>
