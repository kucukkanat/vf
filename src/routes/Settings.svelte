<script lang="ts">
  import Name from '../components/Name.svelte'
  import { session, logout } from '../lib/auth/session.svelte'
  import { getAccount, revealPhrase, changePassword, checkPassword, backupText, removeAccount } from '../lib/auth/keystore'
  import { prefs, savePrefs, isAdult, age } from '../lib/prefs.svelte'
  import { mod, mute } from '../lib/models/moderation.svelte'
  import { readRelays } from '../lib/nostr/pool'
  import { serversFor } from '../lib/media/blossom'
  import { clearCache } from '../lib/nostr/cache'
  import { npub } from '../lib/nostr/util'
  import { href } from '../lib/router.svelte'
  import { APP_NAME } from '../config'

  const acct = session.pubkey ? getAccount(session.pubkey) : undefined
  let pw = $state('')
  let phrase = $state<string | null | undefined>(undefined)
  let oldPw = $state('')
  let newPw = $state('')
  let newPw2 = $state('')
  let msg = $state('')
  let err = $state('')
  let busy = $state(false)
  let servers = $state<string[]>([])
  serversFor(session.pubkey).then((s) => (servers = s))

  async function run(fn: () => Promise<void>) {
    busy = true
    msg = err = ''
    await new Promise((r) => setTimeout(r, 20))
    try {
      await fn()
    } catch (e: any) {
      err = e.message
    } finally {
      busy = false
    }
  }
  const reveal = () => run(async () => {
    phrase = await revealPhrase(session.pubkey!, pw)
    pw = ''
  })
  const change = () => run(async () => {
    const e = checkPassword(newPw) ?? (newPw !== newPw2 ? 'Passwords do not match' : null)
    if (e) throw new Error(e)
    await changePassword(session.pubkey!, oldPw, newPw)
    oldPw = newPw = newPw2 = ''
    msg = 'Password changed.'
  })
  const download = () => run(async () => {
    const p = await revealPhrase(session.pubkey!, pw)
    const text = backupText(APP_NAME, npub(session.pubkey!), p, getAccount(session.pubkey!)!.ncryptsec)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    a.download = `${APP_NAME}-backup.txt`
    a.click()
    pw = ''
  })
  function forget() {
    if (!confirm('Remove this account from this device? Make sure you have your 12 words!')) return
    removeAccount(session.pubkey!)
    logout()
    location.hash = '/'
  }
</script>

<h1>Settings</h1>
<div class="cols-r">
  <div>
    {#if session.pubkey}
      <div class="box"><div class="box-h"><span>Account & backup</span></div><div class="box-b">
        <p><b>Your public key:</b><br /><code style="word-break:break-all">{npub(session.pubkey)}</code></p>
        <p>Login method: <b>{session.signer?.type === 'local' ? 'key on this device (password protected)' : session.signer?.type === 'nip07' ? 'browser extension' : 'remote signer (bunker)'}</b></p>
        {#if acct}
          <hr />
          <h3>Backup phrase</h3>
          {#if phrase}
            <div class="words">{#each phrase.split(' ') as w, i}<div><b>{i + 1}.</b>{w}</div>{/each}</div>
            <button class="small alt" onclick={() => (phrase = undefined)}>Hide</button>
          {:else if phrase === null}
            <p class="warn">This account was imported from an nsec, so it has no 12-word phrase. Back up your nsec yourself.</p>
          {:else}
            <div class="row"><input type="password" placeholder="Password" bind:value={pw} style="max-width:200px" />
              <button class="small" disabled={busy || !pw} onclick={reveal}>Show my 12 words</button>
              <button class="small alt" disabled={busy || !pw} onclick={download}>Download backup</button></div>
          {/if}
          <hr />
          <h3>Change password</h3>
          <input type="password" placeholder="Current password" bind:value={oldPw} autocomplete="current-password" />
          <input type="password" placeholder="New password" bind:value={newPw} style="margin-top:4px" autocomplete="new-password" />
          <input type="password" placeholder="Repeat new password" bind:value={newPw2} style="margin-top:4px" autocomplete="new-password" />
          <button class="small" style="margin-top:4px" disabled={busy || !oldPw || !newPw} onclick={change}>Change password</button>
          <hr />
          <button class="small alt" onclick={forget}>Remove account from this device</button>
        {:else}
          <p class="dim">Your key is managed by your {session.signer?.type === 'nip07' ? 'browser extension' : 'remote signer'}, so there is no backup phrase here.</p>
        {/if}
        {#if msg}<div class="ok">{msg}</div>{/if}
        {#if err}<div class="err">{err}</div>{/if}
      </div></div>
      <div class="box"><div class="box-h"><span>Blocked users ({Object.keys(mod.myMuted).length})</span></div><div class="box-b">
        {#each Object.keys(mod.myMuted) as p (p)}<div class="row"><Name pubkey={p} /> <button class="link small" onclick={() => mute(session.pubkey!, p, false)}>unblock</button></div>
        {:else}<p class="dim small">Nobody blocked.</p>{/each}
      </div></div>
    {:else}
      <p><a href={href('/login')}>Log in</a> to manage your account.</p>
    {/if}
  </div>
  <div>
    <div class="box"><div class="box-h"><span>Preferences</span></div><div class="box-b">
      <p class="small">Age: <b>{age()}</b> (stored only in this browser) <button class="link small" onclick={() => ((prefs.birthYear = null), savePrefs())}>change</button></p>
      {#if isAdult()}
        <label class="inline"><input type="checkbox" bind:checked={prefs.showNsfw} onchange={savePrefs} /> Show NSFW content without warnings</label>
      {/if}
      <label class="inline"><input type="checkbox" bind:checked={prefs.autoplaySongs} onchange={savePrefs} /> Autoplay profile songs (so 2009)</label>
      <label class="inline"><input type="checkbox" bind:checked={prefs.showAllNostr} onchange={savePrefs} /> Show content from non-members (all of Nostr)</label>
    </div></div>
    <div class="box"><div class="box-h"><span>Network</span></div><div class="box-b small">
      <b>Relays</b>
      <ul style="margin:2px 0 6px;padding-left:16px">{#each readRelays() as r}<li>{r}</li>{/each}</ul>
      <b>Media servers (Blossom)</b>
      <ul style="margin:2px 0 6px;padding-left:16px">{#each servers as s}<li>{s}</li>{/each}</ul>
      <button class="small alt" onclick={() => clearCache().then(() => location.reload())}>Clear local cache</button>
    </div></div>
  </div>
</div>
