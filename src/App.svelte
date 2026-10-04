<script lang="ts">
  import { route, href } from './lib/router.svelte'
  import { session, logout } from './lib/auth/session.svelte'
  import { prefs, savePrefs, tooYoung } from './lib/prefs.svelte'
  import { displayName } from './lib/models/profiles.svelte'
  import { isAdmin } from './lib/models/moderation.svelte'
  import { npub } from './lib/nostr/util'
  import { APP_NAME, MIN_JOIN_AGE } from './config'
  import Unlock from './routes/Unlock.svelte'
  import Home from './routes/Home.svelte'
  import Join from './routes/Join.svelte'
  import Login from './routes/Login.svelte'
  import Profile from './routes/Profile.svelte'
  import EditProfile from './routes/EditProfile.svelte'
  import EditLayout from './routes/EditLayout.svelte'
  import Friends from './routes/Friends.svelte'
  import Pics from './routes/Pics.svelte'
  import PicView from './routes/PicView.svelte'
  import Upload from './routes/Upload.svelte'
  import Journals from './routes/Journals.svelte'
  import JournalView from './routes/JournalView.svelte'
  import JournalEdit from './routes/JournalEdit.svelte'
  import Members from './routes/Members.svelte'
  import Online from './routes/Online.svelte'
  import Cults from './routes/Cults.svelte'
  import CultView from './routes/CultView.svelte'
  import CultEdit from './routes/CultEdit.svelte'
  import Forums from './routes/Forums.svelte'
  import Board from './routes/Board.svelte'
  import Thread from './routes/Thread.svelte'
  import Inbox from './routes/Inbox.svelte'
  import Events from './routes/Events.svelte'
  import EventView from './routes/EventView.svelte'
  import EventEdit from './routes/EventEdit.svelte'
  import Settings from './routes/Settings.svelte'
  import Admin from './routes/Admin.svelte'
  import About from './routes/About.svelte'
  import NotFound from './routes/NotFound.svelte'

  const NAV = [
    ['/', 'Home'],
    ['/members', 'Members'],
    ['/pics', 'Pics'],
    ['/journals', 'Journals'],
    ['/cults', 'Cults'],
    ['/forums', 'Forums'],
    ['/events', 'Events'],
    ['/online', 'Online'],
  ]
  let p = $derived(route.parts)
  let section = $derived('/' + (p[0] ?? ''))

  let birthInput = $state('')
  const thisYear = new Date().getFullYear()
  function setBirth(e: SubmitEvent) {
    e.preventDefault()
    const y = Number(birthInput)
    if (!y || y < 1900 || y > thisYear) return
    prefs.birthYear = y
    savePrefs()
  }
</script>

<div class="top">
  <div class="wrap">
    <a class="logo" href={href('/')}>{APP_NAME}<small>the dark alternative community · on nostr</small></a>
    <div class="userbar">
      {#if session.pubkey}
        Logged in as <a href={href('/u/' + npub(session.pubkey))}><b>{displayName(session.pubkey)}</b></a><br />
        <a href={href('/u/' + npub(session.pubkey))}>My Profile</a>
        <a href={href('/inbox')}>Messages</a>
        <a href={href('/friends')}>Friends</a>
        <a href={href('/upload')}>Upload</a>
        <a href={href('/settings')}>Settings</a>
        {#if isAdmin(session.pubkey)}<a href={href('/admin')}>Admin</a>{/if}
        <button class="link" onclick={() => (logout(), (location.hash = '/'))}>Logout</button>
      {:else}
        <a class="btn" href={href('/join')}>Join now — it's free</a>
        <a class="btn alt" href={href('/login')}>Login</a>
      {/if}
    </div>
  </div>
</div>
<div class="nav">
  <div class="wrap">
    {#each NAV as [path, label]}
      <a href={href(path)} class:on={section === path || (path === '/members' && section === '/u')}>{label}</a>
    {/each}
  </div>
</div>

<main class="wrap">
  {#if prefs.birthYear === null}
    <div class="age-gate box">
      <div class="box-h"><span>Welcome to the darkness</span></div>
      <div class="box-b">
        <p>Before you enter, tell us the year you were born.<br /><span class="dim small">This stays in your browser. It is never published.</span></p>
        <form onsubmit={setBirth} class="row" style="justify-content:center">
          <input type="number" min="1900" max={thisYear} placeholder="e.g. 1991" bind:value={birthInput} style="width:110px" />
          <button>Enter</button>
        </form>
      </div>
    </div>
  {:else if tooYoung()}
    <div class="age-gate box">
      <div class="box-h"><span>Sorry</span></div>
      <div class="box-b"><p>You must be at least {MIN_JOIN_AGE} to use {APP_NAME}. Come back when you're older!</p></div>
    </div>
  {:else if session.locked && !session.pubkey && p[0] !== 'login' && p[0] !== 'join'}
    <Unlock />
  {:else if !session.ready}
    <div class="loading">Rising from the grave<span class="blink">...</span></div>
  {:else if p.length === 0}<Home />
  {:else if p[0] === 'join'}<Join />
  {:else if p[0] === 'login'}<Login />
  {:else if p[0] === 'u' && p[1]}
    {#key p[1] + (p[2] ?? '')}
      {#if p[2] === 'friends'}<Friends id={p[1]} />
      {:else if p[2] === 'pics'}<Pics author={p[1]} />
      {:else if p[2] === 'journal'}<Journals author={p[1]} />
      {:else}<Profile id={p[1]} />{/if}
    {/key}
  {:else if p[0] === 'friends'}<Friends id={session.pubkey ? npub(session.pubkey) : ''} mine />
  {:else if p[0] === 'edit' && p[1] === 'layout'}<EditLayout />
  {:else if p[0] === 'edit'}<EditProfile />
  {:else if p[0] === 'pics'}<Pics tab={p[1]} />
  {:else if p[0] === 'pic' && p[1]}{#key p[1]}<PicView id={p[1]} />{/key}
  {:else if p[0] === 'upload'}<Upload />
  {:else if p[0] === 'journals'}<Journals />
  {:else if p[0] === 'j' && p[1]}{#key p[1]}<JournalView naddr={p[1]} />{/key}
  {:else if p[0] === 'journal' && p[1] === 'new'}<JournalEdit />
  {:else if p[0] === 'journal' && p[1] === 'edit' && p[2]}<JournalEdit d={p[2]} />
  {:else if p[0] === 'members'}<Members />
  {:else if p[0] === 'online'}<Online />
  {:else if p[0] === 'cults'}<Cults />
  {:else if p[0] === 'cult' && p[1] === 'new'}<CultEdit />
  {:else if p[0] === 'cult' && p[1] === 'edit' && p[2]}<CultEdit d={p[2]} />
  {:else if p[0] === 'cult' && p[1]}{#key p[1] + (p[3] ?? '')}<CultView naddr={p[1]} post={p[2] === 'p' ? p[3] : undefined} />{/key}
  {:else if p[0] === 'forums' && p[1]}{#key p[1]}<Board board={p[1]} />{/key}
  {:else if p[0] === 'forums'}<Forums />
  {:else if p[0] === 'thread' && p[1]}{#key p[1]}<Thread id={p[1]} />{/key}
  {:else if p[0] === 'inbox'}{#key p[1]}<Inbox peer={p[1]} />{/key}
  {:else if p[0] === 'events'}<Events />
  {:else if p[0] === 'event' && p[1] === 'new'}<EventEdit />
  {:else if p[0] === 'event' && p[1] === 'edit' && p[2]}<EventEdit d={p[2]} />
  {:else if p[0] === 'event' && p[1]}{#key p[1]}<EventView naddr={p[1]} />{/key}
  {:else if p[0] === 'settings'}<Settings />
  {:else if p[0] === 'admin'}<Admin />
  {:else if p[0] === 'about'}<About />
  {:else}<NotFound />{/if}
</main>

<footer>
  <div class="badges">
    <span class="badge88">nostr powered</span>
    <span class="badge88 g">no ads · no servers</span>
    <span class="badge88 p">best viewed at night</span>
    <span class="badge88 b">800x600+</span>
  </div>
  {APP_NAME} is a fan-made parody/tribute running on the open Nostr network. <b>Not affiliated with VampireFreaks.com.</b><br />
  <a href={href('/about')}>About & rules</a> · Content belongs to its authors and is stored on public relays.
</footer>
