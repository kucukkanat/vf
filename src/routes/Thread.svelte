<script lang="ts">
  import Avatar from '../components/Avatar.svelte'
  import Name from '../components/Name.svelte'
  import RichText from '../components/RichText.svelte'
  import Loading from '../components/Loading.svelte'
  import CommentSection from '../components/CommentSection.svelte'
  import ReportButton from '../components/ReportButton.svelte'
  import { loadThread, threadTitle } from '../lib/models/forums'
  import { targetOf } from '../lib/models/comments'
  import { session } from '../lib/auth/session.svelte'
  import { deleteEvents } from '../lib/nostr/publish'
  import { href, go } from '../lib/router.svelte'
  import { fmtDate, tagValues, type Event } from '../lib/nostr/util'
  import { FORUM_BOARDS } from '../config'

  let { id }: { id: string } = $props()
  let t = $state<Event | null>(null)
  let loading = $state(true)
  loadThread(id).then((x) => ((t = x), (loading = false)))
  let board = $derived(t ? FORUM_BOARDS.find((b) => tagValues(t!, 't').includes('vf-board-' + b.id)) : undefined)
  async function del() {
    if (!t || !confirm('Delete this thread?')) return
    await deleteEvents([t])
    go(board ? '/forums/' + board.id : '/forums')
  }
</script>

{#if loading}<Loading />
{:else if !t}<div class="err">Thread not found.</div>
{:else}
  <p><a href={href('/forums')}>Forums</a>{#if board} » <a href={href('/forums/' + board.id)}>{board.name}</a>{/if}</p>
  <div class="box">
    <div class="box-h"><span>{threadTitle(t)}</span><span class="small">{fmtDate(t.created_at)}</span></div>
    <div class="box-b">
      <div class="comment"><Avatar pubkey={t.pubkey} size={50} /><div><div class="meta"><Name pubkey={t.pubkey} />
        {#if session.pubkey === t.pubkey} · <button class="link small" onclick={del}>delete</button>{:else if session.pubkey} · <ReportButton pubkey={t.pubkey} event={t} />{/if}</div><RichText text={t.content} /></div></div>
    </div>
  </div>
  <CommentSection target={targetOf(t)} title="Replies" placeholder="Write a reply…" />
{/if}
