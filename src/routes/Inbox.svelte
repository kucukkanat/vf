<script lang="ts">
  import Avatar from '../components/Avatar.svelte'
  import Name from '../components/Name.svelte'
  import Loading from '../components/Loading.svelte'
  import { fetchInbox, sendDM, conversations, type Rumor } from '../lib/models/dm'
  import { friendsOf } from '../lib/models/social.svelte'
  import { isHidden } from '../lib/models/moderation.svelte'
  import { displayName } from '../lib/models/profiles.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { isAdult } from '../lib/prefs.svelte'
  import { href } from '../lib/router.svelte'
  import { npub, timeAgo, toHex } from '../lib/nostr/util'
  import { live } from '../lib/nostr/pool'
  import { unwrap } from '../lib/models/dm'

  let { peer }: { peer?: string } = $props()
  const peerHex = peer ? toHex(peer) : null
  let rumors = $state<Rumor[]>([])
  let friends = $state<string[]>([])
  let loading = $state(true)
  let text = $state('')
  let error = $state('')
  let busy = $state(false)
  let showRequests = $state(false)
  let box: HTMLDivElement | undefined = $state()

  async function load() {
    if (!session.signer) return
    const [r, f] = await Promise.all([fetchInbox(session.signer), friendsOf(session.pubkey!)])
    rumors = r
    friends = f.friends
    loading = false
  }
  load()
  $effect(() => {
    if (!session.signer || !session.pubkey) return
    const signer = session.signer
    return live({ kinds: [1059], '#p': [session.pubkey], since: Math.floor(Date.now() / 1000) - 3 * 86400 }, async (g) => {
      const r = await unwrap(signer, g)
      if (r && !rumors.some((x) => x.id === r.id)) rumors = [...rumors, r]
    })
  })

  let convs = $derived(session.pubkey ? conversations(rumors, session.pubkey) : new Map<string, Rumor[]>())
  // Members under 18 only see messages from mutual friends; strangers go to hidden requests.
  const allowed = (pk: string) => !isHidden(pk) && (isAdult() || friends.includes(pk) || rumors.some((r) => r.pubkey === session.pubkey && convs.get(pk)?.includes(r)))
  let list = $derived([...convs.entries()].filter(([pk]) => allowed(pk)).sort((a, b) => b[1].at(-1)!.created_at - a[1].at(-1)!.created_at))
  let requests = $derived([...convs.keys()].filter((pk) => !allowed(pk) && !isHidden(pk)))
  let thread = $derived(peerHex ? (convs.get(peerHex) ?? []) : [])
  let blockedPeer = $derived(!!peerHex && !isAdult() && !friends.includes(peerHex) && !loading)

  $effect(() => {
    thread.length
    if (box) setTimeout(() => box && (box.scrollTop = box.scrollHeight), 0)
  })

  async function send(e: SubmitEvent) {
    e.preventDefault()
    if (!text.trim() || !peerHex || !session.signer) return
    busy = true
    error = ''
    try {
      const r = await sendDM(session.signer, peerHex, text.trim())
      rumors = [...rumors, r]
      text = ''
    } catch (err: any) {
      error = err.message
    } finally {
      busy = false
    }
  }
</script>

{#if !session.pubkey}<p><a href={href('/login')}>Log in</a> to read your messages.</p>
{:else}
  <div class="cols">
    <div class="box"><div class="box-h"><span>Conversations</span></div><div class="box-b">
      {#if loading}<Loading text="Decrypting" />{/if}
      {#each list as [pk, msgs] (pk)}
        <a href={href('/inbox/' + npub(pk))} class="row" style="margin-bottom:6px;flex-wrap:nowrap;{pk === peerHex ? 'background:var(--purple-dk)' : ''}">
          <Avatar pubkey={pk} size={32} link={false} />
          <span style="overflow:hidden"><b>{displayName(pk)}</b><br /><span class="small dim">{timeAgo(msgs.at(-1)!.created_at)}</span></span>
        </a>
      {:else}{#if !loading}<p class="dim small">No messages yet. Visit a profile and hit "Send message".</p>{/if}{/each}
      {#if requests.length}
        <hr />
        {#if isAdult()}
          <button class="link small" onclick={() => (showRequests = !showRequests)}>{requests.length} message request(s)</button>
        {:else}
          <p class="small dim">{requests.length} message(s) from non-friends hidden. Members under 18 only receive messages from mutual friends.</p>
        {/if}
      {/if}
    </div></div>
    <div>
      {#if peerHex}
        <div class="box"><div class="box-h"><span>Chat with {displayName(peerHex)}</span><a href={href('/u/' + npub(peerHex))}>profile »</a></div><div class="box-b">
          {#if blockedPeer}
            <div class="warn">You can only message mutual friends. Add <Name pubkey={peerHex} /> as a friend and wait for them to add you back.</div>
          {:else}
            <div class="msgs" bind:this={box}>
              {#each thread as m (m.id)}
                <div class="msg" class:me={m.pubkey === session.pubkey}>{m.content}<div class="t">{timeAgo(m.created_at)}</div></div>
              {:else}<p class="dim small center">Say hi! Messages are end-to-end encrypted (NIP-17).</p>{/each}
            </div>
            <form onsubmit={send} class="row" style="margin-top:6px;flex-wrap:nowrap">
              <input class="grow" bind:value={text} placeholder="Type a message…" maxlength="10000" style="width:auto" />
              <button disabled={busy || !text.trim()}>{busy ? '…' : 'Send'}</button>
            </form>
            {#if error}<div class="err">{error}</div>{/if}
          {/if}
        </div></div>
      {:else if showRequests}
        <div class="box"><div class="box-h"><span>Message requests</span></div><div class="box-b">
          {#each requests as pk}<div class="row" style="margin-bottom:4px"><Avatar pubkey={pk} size={30} /><a href={href('/inbox/' + npub(pk))}>{displayName(pk)}</a></div>{/each}
        </div></div>
      {:else}
        <p class="dim">Select a conversation.</p>
      {/if}
    </div>
  </div>
{/if}
