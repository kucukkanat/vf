<script lang="ts">
  import CommentSection from '../components/CommentSection.svelte'
  import Markdown from '../components/Markdown.svelte'
  import Nsfw from '../components/Nsfw.svelte'
  import Avatar from '../components/Avatar.svelte'
  import Name from '../components/Name.svelte'
  import ZapButton from '../components/ZapButton.svelte'
  import ReportButton from '../components/ReportButton.svelte'
  import Loading from '../components/Loading.svelte'
  import { loadJournal, type Journal } from '../lib/models/journals'
  import { targetOf } from '../lib/models/comments'
  import { session } from '../lib/auth/session.svelte'
  import { deleteEvents } from '../lib/nostr/publish'
  import { href, go } from '../lib/router.svelte'
  import { decodeNaddr, fmtDate, npub } from '../lib/nostr/util'

  let { naddr }: { naddr: string } = $props()
  const a = decodeNaddr(naddr)
  let j = $state<Journal | null>(null)
  let loading = $state(true)
  if (a) loadJournal(a.pubkey, a.identifier).then((x) => ((j = x), (loading = false)))
  else loading = false

  async function del() {
    if (!j || !confirm('Delete this journal entry?')) return
    await deleteEvents([j.event])
    go(`/u/${npub(j.pubkey)}/journal`)
  }
</script>

{#if loading}<Loading />
{:else if !j}<div class="err">Journal entry not found.</div>
{:else}
  <div class="cols-r">
    <div>
      <div class="box">
        <div class="box-h"><span>{j.title}</span><span class="small">{fmtDate(j.published)}</span></div>
        <div class="box-b">
          {#if j.mood || j.music}<p class="small dim">{#if j.mood}Current mood: <span style="color:var(--green)">{j.mood}</span>{/if} {#if j.music}· Listening to: <i>{j.music}</i>{/if}</p>{/if}
          {#if j.image}<img src={j.image} alt="" style="max-height:300px;display:block;margin-bottom:8px" />{/if}
          <Nsfw reason={j.nsfw}><Markdown text={j.body} /></Nsfw>
          {#if j.topics.length}<p>{#each j.topics as t}<span class="pill">{t}</span>{/each}</p>{/if}
        </div>
      </div>
      <CommentSection target={targetOf(j.event)} />
    </div>
    <div>
      <div class="box"><div class="box-h"><span>Written by</span></div><div class="box-b">
        <div class="row"><Avatar pubkey={j.pubkey} size={50} /><div><Name pubkey={j.pubkey} /><br /><a class="small" href={href(`/u/${npub(j.pubkey)}/journal`)}>more entries »</a></div></div>
        <div class="row" style="margin-top:8px">
          <ZapButton pubkey={j.pubkey} event={j.event} />
          {#if session.pubkey === j.pubkey}
            <a class="btn small" href={href('/journal/edit/' + encodeURIComponent(j.d))}>Edit</a>
            <button class="small alt" onclick={del}>Delete</button>
          {:else if session.pubkey}<ReportButton pubkey={j.pubkey} event={j.event} />{/if}
        </div>
      </div></div>
    </div>
  </div>
{/if}
