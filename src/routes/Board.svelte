<script lang="ts">
  import Name from '../components/Name.svelte'
  import Loading from '../components/Loading.svelte'
  import { loadThreads, newThread, replyStats, threadTitle } from '../lib/models/forums'
  import { isHidden } from '../lib/models/moderation.svelte'
  import { isMember } from '../lib/models/profiles.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { prefs } from '../lib/prefs.svelte'
  import { go, href } from '../lib/router.svelte'
  import { timeAgo, type Event } from '../lib/nostr/util'
  import { FORUM_BOARDS } from '../config'

  let { board }: { board: string } = $props()
  const info = FORUM_BOARDS.find((b) => b.id === board)
  let threads = $state<Event[] | null>(null)
  let stats = $state<Record<string, { count: number; last: number; lastBy: string }>>({})
  let title = $state('')
  let body = $state('')
  let open = $state(false)
  let error = $state('')
  let busy = $state(false)

  loadThreads(board).then(async (t) => {
    threads = t
    stats = await replyStats(t.map((x) => x.id))
  })
  const lastActivity = (t: Event) => Math.max(t.created_at, stats[t.id]?.last ?? 0)
  let shown = $derived((threads ?? []).filter((t) => !isHidden(t.pubkey) && (prefs.showAllNostr || isMember(t.pubkey))).sort((a, b) => lastActivity(b) - lastActivity(a)))

  async function post(e: SubmitEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return (error = 'Title and message required')
    busy = true
    try {
      const t = await newThread(board, title.trim(), body.trim())
      go('/thread/' + t.id)
    } catch (err: any) {
      error = err.message
    } finally {
      busy = false
    }
  }
</script>

{#if !info}<div class="err">Unknown board.</div>
{:else}
  <p><a href={href('/forums')}>Forums</a> » <b>{info.name}</b></p>
  <h1>{info.name}</h1>
  {#if session.pubkey}
    {#if open}
      <form class="box" onsubmit={post}><div class="box-h"><span>New thread</span></div><div class="box-b">
        <input bind:value={title} placeholder="Thread title" maxlength="200" />
        <textarea bind:value={body} placeholder="Message" style="margin-top:4px" rows="6"></textarea>
        {#if error}<div class="err">{error}</div>{/if}
        <div class="row" style="margin-top:4px"><button disabled={busy}>Post thread</button><button type="button" class="alt" onclick={() => (open = false)}>Cancel</button></div>
      </div></form>
    {:else}<button style="margin-bottom:8px" onclick={() => (open = true)}>+ New thread</button>{/if}
  {/if}
  {#if !threads}<Loading />{:else}
    <table class="list">
      <thead><tr><th>Thread</th><th>Replies</th><th class="hide-m">Last post</th></tr></thead>
      <tbody>
        {#each shown as t (t.id)}
          <tr>
            <td><a href={href('/thread/' + t.id)}><b>{threadTitle(t)}</b></a><br /><span class="small dim">by <Name pubkey={t.pubkey} /></span></td>
            <td>{stats[t.id]?.count ?? 0}</td>
            <td class="hide-m small">{timeAgo(lastActivity(t))}{#if stats[t.id]?.lastBy}<br />by <Name pubkey={stats[t.id].lastBy} />{/if}</td>
          </tr>
        {:else}<tr><td colspan="3" class="dim">No threads yet. Start one!</td></tr>{/each}
      </tbody>
    </table>
  {/if}
{/if}
