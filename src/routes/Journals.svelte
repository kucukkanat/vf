<script lang="ts">
  import Avatar from '../components/Avatar.svelte'
  import Name from '../components/Name.svelte'
  import Loading from '../components/Loading.svelte'
  import { loadJournals, type Journal } from '../lib/models/journals'
  import { displayName, isMember } from '../lib/models/profiles.svelte'
  import { isHidden } from '../lib/models/moderation.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { prefs } from '../lib/prefs.svelte'
  import { href } from '../lib/router.svelte'
  import { naddr, npub, timeAgo, toHex } from '../lib/nostr/util'

  let { author }: { author?: string } = $props()
  const pk = author ? toHex(author) : null
  let list = $state<Journal[]>([])
  let loading = $state(true)
  loadJournals(pk ? { authors: [pk], limit: 100 } : { limit: 60 }).then((l) => ((list = l), (loading = false)))
  let shown = $derived(list.filter((j) => !isHidden(j.pubkey) && (pk || prefs.showAllNostr || isMember(j.pubkey))))
</script>

<h1>{pk ? `${displayName(pk)}'s journal` : 'Journals'}</h1>
<div class="row" style="margin-bottom:8px">
  {#if pk}<a href={href('/u/' + npub(pk))}>« back to profile</a>{/if}
  {#if session.pubkey && (!pk || pk === session.pubkey)}<a class="btn small" href={href('/journal/new')}>Write a journal entry</a>{/if}
</div>
{#if loading}<Loading />{:else if !shown.length}<p class="dim">No journal entries yet.</p>{/if}
{#each shown as j (j.id)}
  <div class="box">
    <div class="box-h"><a style="color:#fff;font-size:11px" href={href('/j/' + naddr(30023, j.pubkey, j.d))}>{j.title}</a><span class="small">{timeAgo(j.published)}</span></div>
    <div class="box-b row" style="align-items:flex-start;flex-wrap:nowrap">
      {#if !pk}<Avatar pubkey={j.pubkey} size={40} />{/if}
      <div class="grow">
        {#if !pk}<div class="small">by <Name pubkey={j.pubkey} /></div>{/if}
        {#if j.mood || j.music}<div class="small dim">{#if j.mood}mood: <span style="color:var(--green)">{j.mood}</span> {/if}{#if j.music}· listening to: {j.music}{/if}</div>{/if}
        <p style="margin:4px 0">{j.nsfw ? '[content warning]' : j.summary || j.body.slice(0, 280).replace(/[#*_>`]/g, '') + (j.body.length > 280 ? '…' : '')}</p>
        <a class="small" href={href('/j/' + naddr(30023, j.pubkey, j.d))}>read more & comment »</a>
      </div>
    </div>
  </div>
{/each}
