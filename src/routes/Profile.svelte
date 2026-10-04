<script lang="ts">
  import LayoutFrame from '../components/LayoutFrame.svelte'
  import CommentSection from '../components/CommentSection.svelte'
  import Player from '../components/Player.svelte'
  import ZapButton from '../components/ZapButton.svelte'
  import ReportButton from '../components/ReportButton.svelte'
  import Loading from '../components/Loading.svelte'
  import { metas, vfs, refreshProfile, displayName, want } from '../lib/models/profiles.svelte'
  import { social, follow, friendsOf, loadTop8, addToTop8 } from '../lib/models/social.svelte'
  import { loadLayout, type Layout } from '../lib/models/layout'
  import { loadPics, type Pic } from '../lib/models/pics'
  import { loadJournals, type Journal } from '../lib/models/journals'
  import { whoIsOnline } from '../lib/models/presence'
  import { mod, mute, isAdmin } from '../lib/models/moderation.svelte'
  import { zapTotal } from '../lib/models/zaps'
  import { buildProfileHtml } from '../lib/profileHtml'
  import { session } from '../lib/auth/session.svelte'
  import { canSeeNsfw } from '../lib/prefs.svelte'
  import { href } from '../lib/router.svelte'
  import { naddr, npub, toHex } from '../lib/nostr/util'
  import { D } from '../config'

  let { id }: { id: string } = $props()
  const pk = toHex(id)

  let loading = $state(true)
  let layout = $state<Layout | null>(null)
  let top8 = $state<string[]>([])
  let friends = $state<string[]>([])
  let pics = $state<Pic[]>([])
  let journals = $state<Journal[]>([])
  let online = $state(false)
  let plain = $state(false)
  let kudos = $state({ sats: 0, count: 0 })
  let busy = $state(false)
  let msg = $state('')

  async function load() {
    if (!pk) return
    await refreshProfile(pk)
    loading = false
    const [l, t, f, p, j, o] = await Promise.all([
      loadLayout(pk),
      loadTop8(pk),
      friendsOf(pk),
      loadPics({ authors: [pk], limit: 30 }),
      loadJournals({ authors: [pk], limit: 10 }),
      whoIsOnline(),
    ])
    layout = l
    top8 = t
    t.forEach((x) => want(x))
    friends = f.friends
    pics = p
    journals = j
    online = o.includes(pk)
    zapTotal(pk).then((z) => (kudos = z))
  }
  load()

  let isMe = $derived(session.pubkey === pk)
  let following = $derived(!!pk && social.follows.includes(pk))
  let srcdoc = $state('')
  let timer: ReturnType<typeof setTimeout>
  $effect(() => {
    if (!pk) return
    const doc = {
      pubkey: pk,
      meta: metas[pk],
      vf: vfs[pk],
      top8: top8.map((p) => ({ pubkey: p, name: displayName(p), picture: metas[p]?.picture })),
      friendCount: friends.length,
      pics,
      journals: journals.map((j) => ({ title: j.title, naddr: naddr(30023, j.pubkey, j.d) })),
      online,
      canSeeNsfw: canSeeNsfw(),
    }
    const custom = !plain && layout ? { html: layout.html, css: layout.css } : null
    clearTimeout(timer)
    timer = setTimeout(() => (srcdoc = buildProfileHtml(doc, custom)), srcdoc ? 400 : 0)
  })

  async function act(fn: () => Promise<unknown>, done: string) {
    busy = true
    msg = ''
    try {
      await fn()
      msg = done
    } catch (e: any) {
      msg = 'Error: ' + e.message
    } finally {
      busy = false
    }
  }
</script>

{#if !pk}
  <div class="err">Invalid profile address.</div>
{:else if loading && !metas[pk]}
  <Loading />
{:else}
  {#if mod.adminMuted[pk]}<div class="warn">This account has been blocked by the site admins.</div>{/if}
  {#if !vfs[pk]}<div class="warn small">This Nostr user hasn't joined VampireFreeks yet. They don't have a VF profile.</div>{/if}
  <div class="box">
    <div class="box-b row" style="justify-content:space-between">
      <div class="row">
        <b style="font-size:13px">{displayName(pk)}</b>
        {#if online}<span class="online-dot" title="online now"></span>{/if}
        {#if kudos.count}<span class="pill" title="Lightning kudos">⚡ {kudos.sats.toLocaleString()} sats</span>{/if}
        {#if isAdmin(pk)}<span class="pill">admin</span>{/if}
      </div>
      <div class="row">
        {#if isMe}
          <a class="btn small" href={href('/edit')}>Edit profile</a>
          <a class="btn small" href={href('/edit/layout')}>Edit layout</a>
          <a class="btn alt small" href={href('/friends')}>Friends / Top 8</a>
        {:else if session.pubkey}
          <button class="small" disabled={busy} onclick={() => act(() => follow(session.pubkey!, pk, !following), following ? 'Removed from friends' : 'Friend request sent (they become a friend when they add you back)')}>
            {following ? 'Unfriend' : '+ Add friend'}
          </button>
          <a class="btn small" href={href('/inbox/' + npub(pk))}>Send message</a>
          <button class="alt small" disabled={busy} onclick={() => act(() => addToTop8(session.pubkey!, pk), 'Added to your Top 8')}>Add to Top 8</button>
          <ZapButton pubkey={pk} />
          <button class="link small" onclick={() => confirm(mod.myMuted[pk] ? 'Unblock?' : 'Block this user? You will no longer see their content.') && act(() => mute(session.pubkey!, pk, !mod.myMuted[pk]), 'Done')}>{mod.myMuted[pk] ? 'unblock' : 'block'}</button>
          <ReportButton pubkey={pk} />
        {/if}
        {#if layout && (layout.css || layout.html)}
          <button class="link small" onclick={() => (plain = !plain)}>{plain ? 'view custom layout' : 'view plain'}</button>
        {/if}
      </div>
    </div>
    {#if msg}<div class="box-b" style="padding-top:0"><span class="ok small">{msg}</span></div>{/if}
  </div>

  {#if vfs[pk]?.song}
    <div style="margin-bottom:10px"><Player url={vfs[pk].song!.url} title={vfs[pk].song!.title} /></div>
  {/if}

  {#if srcdoc}<LayoutFrame {srcdoc} />{/if}

  <div class="row small" style="margin:6px 0 10px">
    <a href={href(`/u/${npub(pk)}/pics`)}>Pics ({pics.length})</a> ·
    <a href={href(`/u/${npub(pk)}/journal`)}>Journal ({journals.length})</a> ·
    <a href={href(`/u/${npub(pk)}/friends`)}>Friends ({friends.length})</a>
    <span class="dim">· {npub(pk)}</span>
  </div>

  <CommentSection target={{ kind: 30078, pubkey: pk, d: D.profile }} title="Comments" placeholder={`Say something to ${displayName(pk)}…`} />
{/if}
