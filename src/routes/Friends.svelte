<script lang="ts">
  import UserCard from '../components/UserCard.svelte'
  import Avatar from '../components/Avatar.svelte'
  import Name from '../components/Name.svelte'
  import Loading from '../components/Loading.svelte'
  import { friendsOf, loadTop8, saveTop8, follow, social } from '../lib/models/social.svelte'
  import { displayName, isMember, want } from '../lib/models/profiles.svelte'
  import { isHidden } from '../lib/models/moderation.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { prefs } from '../lib/prefs.svelte'
  import { href } from '../lib/router.svelte'
  import { toHex } from '../lib/nostr/util'

  let { id, mine = false }: { id: string; mine?: boolean } = $props()
  const pk = toHex(id)
  let data = $state<{ friends: string[]; requests: string[]; following: string[] } | null>(null)
  let top8 = $state<string[]>([])
  let msg = $state('')
  let isMe = $derived(pk === session.pubkey)

  async function load() {
    if (!pk) return
    const [d, t] = await Promise.all([friendsOf(pk), loadTop8(pk)])
    ;[...d.friends, ...d.requests].forEach((p) => want(p))
    data = d
    top8 = t
  }
  load()

  const show = (p: string) => !isHidden(p) && (prefs.showAllNostr || isMember(p))
  let friends = $derived((data?.friends ?? []).filter(show))
  let requests = $derived((data?.requests ?? []).filter(show))
  let pendingOut = $derived(isMe && data ? data.following.filter((p) => !data!.friends.includes(p)).filter(show) : [])

  function move(i: number, dir: number) {
    const j = i + dir
    if (j < 0 || j >= top8.length) return
    const t = [...top8]
    ;[t[i], t[j]] = [t[j], t[i]]
    top8 = t
  }
  async function saveT8() {
    try {
      await saveTop8(top8)
      msg = 'Top 8 saved!'
    } catch (e: any) {
      msg = 'Error: ' + e.message
    }
  }
  async function accept(p: string) {
    await follow(session.pubkey!, p, true)
    if (data) data = { ...data, friends: [...data.friends, p], requests: data.requests.filter((x) => x !== p), following: [...data.following, p] }
  }
</script>

{#if !pk}
  <p><a href={href('/login')}>Log in</a> to see your friends.</p>
{:else if !data}
  <Loading />
{:else}
  <h1>{isMe ? 'My friends' : `${displayName(pk)}'s friends`}</h1>
  {#if isMe}
    <div class="box"><div class="box-h"><span>Edit my Top 8</span></div><div class="box-b">
      {#if !top8.length}<p class="dim">Add friends to your Top 8 from their profile, or from the list below.</p>{/if}
      <table class="list"><tbody>
        {#each top8 as p, i (p)}
          <tr><td style="width:30px">#{i + 1}</td><td><div class="row"><Avatar pubkey={p} size={30} /><Name pubkey={p} /></div></td>
            <td class="right"><button class="small alt" onclick={() => move(i, -1)}>▲</button> <button class="small alt" onclick={() => move(i, 1)}>▼</button> <button class="small" onclick={() => (top8 = top8.filter((x) => x !== p))}>remove</button></td></tr>
        {/each}
      </tbody></table>
      <div class="row" style="margin-top:6px"><button onclick={saveT8}>Save Top 8</button>{#if msg}<span class="ok small">{msg}</span>{/if}</div>
    </div></div>
    {#if requests.length}
      <div class="box"><div class="box-h"><span>Friend requests ({requests.length})</span></div><div class="box-b">
        <p class="dim small">These members added you. Add them back to become friends.</p>
        <table class="list"><tbody>
          {#each requests as p (p)}
            <tr><td><div class="row"><Avatar pubkey={p} size={36} /><Name pubkey={p} /></div></td><td class="right"><button class="small" onclick={() => accept(p)}>Accept</button></td></tr>
          {/each}
        </tbody></table>
      </div></div>
    {/if}
  {/if}
  <div class="box"><div class="box-h"><span>Friends ({friends.length})</span></div><div class="box-b">
    {#if !friends.length}<p class="dim">No friends yet. Friends are members who added each other.</p>{/if}
    <div class="ugrid">
      {#each friends as p (p)}
        <div>
          <UserCard pubkey={p} />
          {#if isMe && top8.length < 8 && !top8.includes(p)}<div class="center"><button class="link small" onclick={() => (top8 = [...top8, p])}>+ top 8</button></div>{/if}
        </div>
      {/each}
    </div>
  </div></div>
  {#if pendingOut.length}
    <div class="box"><div class="box-h"><span>Waiting for them to add you back ({pendingOut.length})</span></div><div class="box-b"><div class="ugrid">{#each pendingOut as p (p)}<UserCard pubkey={p} size={50} />{/each}</div></div></div>
  {/if}
  {#if !social.loaded && isMe}<Loading />{/if}
{/if}
