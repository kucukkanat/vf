<script lang="ts">
  import Name from '../components/Name.svelte'
  import { isAdmin, admins, mod, mute, loadAdminLists } from '../lib/models/moderation.svelte'
  import { query } from '../lib/nostr/pool'
  import { session } from '../lib/auth/session.svelte'
  import { href } from '../lib/router.svelte'
  import { tag, timeAgo, toHex, type Event } from '../lib/nostr/util'
  import { APP_TAG } from '../config'

  let reports = $state<Event[]>([])
  let target = $state('')
  let msg = $state('')
  loadAdminLists()
  query({ kinds: [1984], '#t': [APP_TAG], limit: 200 }).then((r) => (reports = r))

  async function ban() {
    const pk = toHex(target)
    if (!pk) return (msg = 'Invalid npub')
    await mute(session.pubkey!, pk, true)
    await loadAdminLists()
    msg = 'User blocked site-wide.'
    target = ''
  }
</script>

{#if !isAdmin(session.pubkey)}
  <div class="err">Admins only.</div>
{:else}
  <h1>Admin</h1>
  <div class="cols-r">
    <div>
      <div class="box"><div class="box-h"><span>Recent reports</span></div><div class="box-b">
        <table class="list">
          <thead><tr><th>Reported</th><th>Reason</th><th>By</th><th></th></tr></thead>
          <tbody>
            {#each reports as r (r.id)}
              {@const p = tag(r, 'p')!}
              <tr>
                <td><Name pubkey={p} />{#if tag(r, 'e')}<br /><span class="small dim">event {tag(r, 'e')!.slice(0, 8)}</span>{/if}</td>
                <td>{r.tags.find((t) => t[0] === 'p')?.[2] ?? ''}<br /><span class="small">{r.content}</span></td>
                <td class="small"><Name pubkey={r.pubkey} /><br />{timeAgo(r.created_at)}</td>
                <td>{#if mod.adminMuted[p]}<span class="pill">blocked</span>{:else}<button class="small" onclick={() => mute(session.pubkey!, p, true).then(loadAdminLists)}>block</button>{/if}</td>
              </tr>
            {:else}<tr><td colspan="4" class="dim">No reports.</td></tr>{/each}
          </tbody>
        </table>
      </div></div>
    </div>
    <div>
      <div class="box"><div class="box-h"><span>Tools</span></div><div class="box-b">
        <p><a class="btn small" href={href('/journal/new?news=1')}>Post site news</a></p>
        <p class="small dim">Feature pics using the "Feature" button on any pic page.</p>
        <label for="b">Block user site-wide</label>
        <div class="row"><input id="b" class="grow" bind:value={target} placeholder="npub…" style="width:auto" /><button class="small" onclick={ban}>Block</button></div>
        {#if msg}<div class="ok">{msg}</div>{/if}
      </div></div>
      <div class="box"><div class="box-h"><span>Admins</span></div><div class="box-b">{#each admins as a}<div><Name pubkey={a} /></div>{/each}</div></div>
      <div class="box"><div class="box-h"><span>Globally blocked ({Object.keys(mod.adminMuted).length})</span></div><div class="box-b small">
        {#each Object.keys(mod.adminMuted) as p}<div><Name pubkey={p} /></div>{/each}
      </div></div>
    </div>
  </div>
{/if}
