<script lang="ts">
  import Avatar from '../components/Avatar.svelte'
  import Name from '../components/Name.svelte'
  import RichText from '../components/RichText.svelte'
  import Loading from '../components/Loading.svelte'
  import UserCard from '../components/UserCard.svelte'
  import ReportButton from '../components/ReportButton.svelte'
  import { loadCult, loadCultPosts, isTopLevel, isApproved, approve, postToCult, replyInCult, threadReplies, myCults, joinCult, cultMembers, type Cult } from '../lib/models/cults'
  import { isHidden } from '../lib/models/moderation.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { deleteEvents } from '../lib/nostr/publish'
  import { href } from '../lib/router.svelte'
  import { decodeNaddr, tag, timeAgo, type Event } from '../lib/nostr/util'

  let { naddr, post }: { naddr: string; post?: string } = $props()
  const a = decodeNaddr(naddr)
  let cult = $state<Cult | null>(null)
  let posts = $state<Event[]>([])
  let approved = $state(new Set<string>())
  let members = $state<string[]>([])
  let joined = $state(false)
  let loading = $state(true)
  let showPending = $state(false)
  let subject = $state('')
  let body = $state('')
  let reply = $state('')
  let error = $state('')
  let busy = $state(false)

  async function load() {
    if (!a) return (loading = false)
    cult = await loadCult(a.pubkey, a.identifier)
    loading = false
    if (!cult) return
    const r = await loadCultPosts(cult)
    posts = r.posts
    approved = r.approved
    cultMembers(cult).then((m) => (members = m))
    if (session.pubkey) myCults(session.pubkey).then((m) => (joined = m.includes(cult!.addr)))
  }
  load()

  let isMod = $derived(!!cult && !!session.pubkey && cult.moderators.includes(session.pubkey))
  let tops = $derived(posts.filter((p) => isTopLevel(p) && !isHidden(p.pubkey)).sort((x, y) => y.created_at - x.created_at))
  let visible = $derived(cult ? tops.filter((p) => isApproved(cult!, p, approved) || p.pubkey === session.pubkey) : [])
  let pending = $derived(cult ? tops.filter((p) => !isApproved(cult!, p, approved)) : [])
  let current = $derived(post ? posts.find((p) => p.id === post) : undefined)
  let replies = $derived(current ? threadReplies(posts, current).filter((r) => !isHidden(r.pubkey)) : [])
  const replyCount = (p: Event) => threadReplies(posts, p).length

  async function run(fn: () => Promise<unknown>) {
    busy = true
    error = ''
    try {
      await fn()
    } catch (e: any) {
      error = e.message
    } finally {
      busy = false
    }
  }
  const submitPost = () => run(async () => {
    if (!subject.trim() || !body.trim()) throw new Error('Subject and message required')
    const e = await postToCult(cult!, subject.trim(), body.trim())
    posts = [e, ...posts]
    subject = body = ''
  })
  const submitReply = () => run(async () => {
    if (!reply.trim() || !current) return
    const e = await replyInCult(cult!, current, current, reply.trim())
    posts = [...posts, e]
    reply = ''
  })
  const doApprove = (p: Event) => run(async () => {
    await approve(cult!, p)
    approved = new Set([...approved, p.id])
  })
  const toggleJoin = () => run(async () => {
    await joinCult(session.pubkey!, cult!, !joined)
    joined = !joined
    members = joined ? [...members, session.pubkey!] : members.filter((m) => m !== session.pubkey)
  })
  const del = (p: Event) => run(async () => {
    if (!confirm('Delete?')) return
    await deleteEvents([p])
    posts = posts.filter((x) => x.id !== p.id)
  })
</script>

{#if loading}<Loading />
{:else if !cult}<div class="err">Cult not found.</div>
{:else}
  <div class="cols-r">
    <div>
      {#if current}
        <p><a href={href('/cult/' + naddr)}>« back to {cult.name}</a></p>
        <div class="box">
          <div class="box-h"><span>{tag(current, 'subject') ?? 'Post'}</span><span class="small">{timeAgo(current.created_at)}</span></div>
          <div class="box-b">
            <div class="comment"><Avatar pubkey={current.pubkey} size={46} /><div><div class="meta"><Name pubkey={current.pubkey} /></div><RichText text={current.content} /></div></div>
            {#each replies as r (r.id)}
              <div class="comment"><Avatar pubkey={r.pubkey} size={40} /><div><div class="meta"><Name pubkey={r.pubkey} /> · {timeAgo(r.created_at)} {#if r.pubkey === session.pubkey || isMod}· <button class="link small" onclick={() => del(r)}>delete</button>{/if}</div><RichText text={r.content} /></div></div>
            {/each}
            {#if session.pubkey}
              <textarea bind:value={reply} placeholder="Write a reply…" style="margin-top:8px"></textarea>
              <button style="margin-top:4px" disabled={busy || !reply.trim()} onclick={submitReply}>Reply</button>
            {/if}
          </div>
        </div>
      {:else}
        <div class="box">
          <div class="box-h"><span>{cult.name}</span>{#if isMod}<a href={href('/cult/edit/' + encodeURIComponent(cult.d))}>edit cult</a>{/if}</div>
          <div class="box-b">
            <div class="row" style="align-items:flex-start;flex-wrap:nowrap">
              {#if cult.image}<img src={cult.image} alt="" style="width:100px;height:100px;object-fit:cover;border:1px solid #444" />{/if}
              <div><RichText text={cult.description} />{#if cult.rules}<p class="small"><b>Rules:</b> {cult.rules}</p>{/if}</div>
            </div>
          </div>
        </div>
        {#if session.pubkey}
          <div class="box"><div class="box-h"><span>New topic</span></div><div class="box-b">
            <input bind:value={subject} placeholder="Subject" maxlength="200" />
            <textarea bind:value={body} placeholder="Message" style="margin-top:4px"></textarea>
            <div class="row" style="margin-top:4px"><button disabled={busy} onclick={submitPost}>Post</button>{#if !isMod}<span class="dim small">Posts appear once a moderator approves them.</span>{/if}</div>
          </div></div>
        {/if}
        <div class="box"><div class="box-h"><span>Topics</span>
          {#if pending.length}<button class="link small" style="color:#fcc" onclick={() => (showPending = !showPending)}>{showPending ? 'hide' : 'show'} {pending.length} pending</button>{/if}</div>
          <div class="box-b">
            <table class="list">
              <thead><tr><th>Topic</th><th>Replies</th><th class="hide-m">Started</th></tr></thead>
              <tbody>
                {#each showPending ? [...visible, ...pending.filter((p) => !visible.includes(p))] : visible as p (p.id)}
                  <tr>
                    <td><a href={href(`/cult/${naddr}/p/${p.id}`)}><b>{tag(p, 'subject') ?? p.content.slice(0, 60)}</b></a> by <Name pubkey={p.pubkey} />
                      {#if !isApproved(cult, p, approved)}<span class="pill">pending</span>{#if isMod} <button class="small" onclick={() => doApprove(p)}>approve</button>{/if}{/if}
                      {#if p.pubkey === session.pubkey || isMod} <button class="link small" onclick={() => del(p)}>delete</button>{:else if session.pubkey} <ReportButton pubkey={p.pubkey} event={p} />{/if}</td>
                    <td>{replyCount(p)}</td>
                    <td class="hide-m small dim">{timeAgo(p.created_at)}</td>
                  </tr>
                {:else}<tr><td colspan="3" class="dim">No topics yet.</td></tr>{/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
      {#if error}<div class="err">{error}</div>{/if}
    </div>
    <div>
      <div class="box"><div class="box-h"><span>Cult info</span></div><div class="box-b">
        {#if session.pubkey && session.pubkey !== cult.owner}<button disabled={busy} onclick={toggleJoin}>{joined ? 'Leave cult' : 'Join cult'}</button>{/if}
        <p><b>Leader:</b> <Name pubkey={cult.owner} /></p>
        <p><b>Moderators:</b> {#each cult.moderators as m, i}{#if i}, {/if}<Name pubkey={m} />{/each}</p>
        <p><b>Members:</b> {members.length}</p>
      </div></div>
      {#if members.length}
        <div class="box"><div class="box-h"><span>Members</span></div><div class="box-b"><div class="ugrid">{#each members.filter((m) => !isHidden(m)).slice(0, 24) as m (m)}<UserCard pubkey={m} size={44} />{/each}</div></div></div>
      {/if}
    </div>
  </div>
{/if}
