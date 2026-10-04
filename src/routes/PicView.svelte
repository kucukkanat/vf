<script lang="ts">
  import CommentSection from '../components/CommentSection.svelte'
  import RatingBar from '../components/RatingBar.svelte'
  import Nsfw from '../components/Nsfw.svelte'
  import Avatar from '../components/Avatar.svelte'
  import Name from '../components/Name.svelte'
  import ZapButton from '../components/ZapButton.svelte'
  import ReportButton from '../components/ReportButton.svelte'
  import Loading from '../components/Loading.svelte'
  import RichText from '../components/RichText.svelte'
  import { loadPics, loadRatings, aggregate, type Pic, type Score } from '../lib/models/pics'
  import { voteEligible, isAdmin, mod, setFeatured } from '../lib/models/moderation.svelte'
  import { targetOf } from '../lib/models/comments'
  import { session } from '../lib/auth/session.svelte'
  import { deleteEvents } from '../lib/nostr/publish'
  import { href, go } from '../lib/router.svelte'
  import { fmtDate, npub } from '../lib/nostr/util'

  let { id }: { id: string } = $props()
  let pic = $state<Pic | null>(null)
  let score = $state<Score | undefined>()
  let loading = $state(true)
  let src = $state('')

  async function load() {
    const [p] = await loadPics({ ids: [id] })
    pic = p ?? null
    if (p) src = p.url
    loading = false
    await refreshScore()
  }
  async function refreshScore() {
    if (!pic) return
    const r = await loadRatings([pic.id])
    score = aggregate(r, voteEligible, session.pubkey, { [pic.id]: pic.pubkey })[pic.id]
  }
  load()

  async function del() {
    if (!pic || !confirm('Delete this pic?')) return
    await deleteEvents([pic.event])
    go('/u/' + npub(pic.pubkey) + '/pics')
  }
  let featured = $derived(!!pic && mod.featured.includes(pic.id))
</script>

{#if loading}
  <Loading />
{:else if !pic}
  <div class="err">Pic not found.</div>
{:else}
  <div class="cols-r">
    <div>
      <div class="box">
        <div class="box-h"><span>{pic.title || 'Untitled'}</span>{#if featured}<span class="pill">★ featured</span>{/if}</div>
        <div class="box-b">
          <Nsfw reason={pic.nsfw}>
            <a href={src} target="_blank" rel="noopener noreferrer"><img class="bigpic" {src} alt={pic.title} onerror={() => pic && pic.fallbacks[0] && src !== pic.fallbacks[0] && (src = pic.fallbacks[0])} /></a>
          </Nsfw>
          {#if pic.desc}<div style="margin-top:8px"><RichText text={pic.desc} /></div>{/if}
        </div>
      </div>
      <CommentSection target={targetOf(pic.event)} />
    </div>
    <div>
      <div class="box"><div class="box-h"><span>Rating</span></div><div class="box-b">
        <RatingBar {pic} {score} onrated={(n) => ((score = { avg: score?.avg ?? 0, count: score?.count ?? 0, mine: n }), setTimeout(refreshScore, 1500))} />
        <p class="dim small center">Votes count from established members and your friends.</p>
      </div></div>
      <div class="box"><div class="box-h"><span>Posted by</span></div><div class="box-b">
        <div class="row"><Avatar pubkey={pic.pubkey} size={50} /><div><Name pubkey={pic.pubkey} /><br /><span class="dim small">{fmtDate(pic.created_at)}</span><br /><a class="small" href={href(`/u/${npub(pic.pubkey)}/pics`)}>more pics »</a></div></div>
        <div class="row" style="margin-top:8px">
          <ZapButton pubkey={pic.pubkey} event={pic.event} />
          {#if session.pubkey === pic.pubkey}<button class="small alt" onclick={del}>Delete</button>{:else if session.pubkey}<ReportButton pubkey={pic.pubkey} event={pic.event} />{/if}
          {#if isAdmin(session.pubkey)}<button class="small alt" onclick={() => setFeatured(session.pubkey!, pic!.id, !featured)}>{featured ? 'Unfeature' : 'Feature'}</button>{/if}
        </div>
      </div></div>
    </div>
  </div>
{/if}
