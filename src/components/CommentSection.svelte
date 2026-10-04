<script lang="ts">
  import Avatar from './Avatar.svelte'
  import Name from './Name.svelte'
  import RichText from './RichText.svelte'
  import Loading from './Loading.svelte'
  import ReportButton from './ReportButton.svelte'
  import { loadComments, parentId, postComment, type Target } from '../lib/models/comments'
  import { isHidden } from '../lib/models/moderation.svelte'
  import { prefs } from '../lib/prefs.svelte'
  import { isMember } from '../lib/models/profiles.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { deleteEvents } from '../lib/nostr/publish'
  import { href } from '../lib/router.svelte'
  import { timeAgo, type Event } from '../lib/nostr/util'

  let { target, title = 'Comments', placeholder = 'Leave a comment…' }: { target: Target; title?: string; placeholder?: string } = $props()

  let comments = $state<Event[]>([])
  let loading = $state(true)
  let text = $state('')
  let replyTo = $state<Event | null>(null)
  let busy = $state(false)
  let error = $state('')

  $effect(() => {
    const t = target
    loading = true
    loadComments(t).then((c) => {
      comments = c
      loading = false
    })
  })

  let visible = $derived(comments.filter((c) => !isHidden(c.pubkey) && (prefs.showAllNostr || isMember(c.pubkey) || c.pubkey === session.pubkey)))
  let top = $derived(visible.filter((c) => !parentId(c) || !visible.some((p) => p.id === parentId(c))).sort((a, b) => b.created_at - a.created_at))
  const repliesOf = (id: string) => visible.filter((c) => parentId(c) === id).sort((a, b) => a.created_at - b.created_at)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!text.trim()) return
    busy = true
    error = ''
    try {
      const c = await postComment(target, text.trim(), replyTo ?? undefined)
      comments = [c, ...comments]
      text = ''
      replyTo = null
    } catch (err: any) {
      error = err.message
    } finally {
      busy = false
    }
  }
  async function del(c: Event) {
    if (!confirm('Delete this comment?')) return
    await deleteEvents([c])
    comments = comments.filter((x) => x.id !== c.id)
  }
</script>

{#snippet item(c: Event, depth: number)}
  <div class="comment">
    <Avatar pubkey={c.pubkey} size={depth ? 32 : 46} />
    <div>
      <div class="meta"><Name pubkey={c.pubkey} /> · {timeAgo(c.created_at)}
        {#if session.pubkey}
          · <button class="link small" onclick={() => (replyTo = c)}>reply</button>
          {#if c.pubkey === session.pubkey}· <button class="link small" onclick={() => del(c)}>delete</button>{:else}· <ReportButton pubkey={c.pubkey} event={c} />{/if}
        {/if}
      </div>
      <RichText text={c.content} />
      {#if depth < 3}
        {@const rs = repliesOf(c.id)}
        {#if rs.length}
          <div class="replies">{#each rs as r (r.id)}{@render item(r, depth + 1)}{/each}</div>
        {/if}
      {/if}
    </div>
  </div>
{/snippet}

<div class="box">
  <div class="box-h"><span>{title} ({visible.length})</span></div>
  <div class="box-b">
    {#if session.pubkey}
      <form onsubmit={submit}>
        {#if replyTo}
          <div class="dim small">Replying to <Name pubkey={replyTo.pubkey} /> <button type="button" class="link small" onclick={() => (replyTo = null)}>[cancel]</button></div>
        {/if}
        <textarea bind:value={text} {placeholder} maxlength="5000"></textarea>
        <div class="row" style="margin-top:4px"><button disabled={busy || !text.trim()}>{busy ? 'Posting…' : 'Post comment'}</button></div>
        {#if error}<div class="err">{error}</div>{/if}
      </form>
    {:else}
      <p class="dim"><a href={href('/login')}>Log in</a> or <a href={href('/join')}>join</a> to leave a comment.</p>
    {/if}
    {#if loading}<Loading />{:else if !top.length}<p class="dim">No comments yet. Be the first!</p>{/if}
    {#each top as c (c.id)}{@render item(c, 0)}{/each}
  </div>
</div>
