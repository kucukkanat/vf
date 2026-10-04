import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Route components are re-created via {#key} when their params change, so
    // capturing initial prop values is intentional.
    warningFilter: (w) => w.code !== 'state_referenced_locally',
  },
}
