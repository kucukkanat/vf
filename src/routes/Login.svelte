<script lang="ts">
  import { keyFromPhrase, listAccounts, unlock, saveAccount, parseSecret, decryptNcryptsec, checkPassword } from '../lib/auth/keystore'
  import { loginLocal, loginNip07, loginBunker, session } from '../lib/auth/session.svelte'
  import { displayName, refreshProfile, vfs } from '../lib/models/profiles.svelte'
  import { go, route, href } from '../lib/router.svelte'
  import { npub } from '../lib/nostr/util'
  import Avatar from '../components/Avatar.svelte'

  const accounts = listAccounts()
  type Tab = 'device' | 'phrase' | 'key' | 'extension' | 'bunker'
  let tab = $state<Tab>((route.query.get('tab') as Tab) || (accounts.length ? 'device' : 'phrase'))
  let error = $state('')
  let busy = $state(false)
  let pw = $state('')
  let pw2 = $state('')
  let chosen = $state(accounts[0]?.pubkey ?? '')
  let phrase = $state('')
  let secret = $state('')
  let bunker = $state('')
  let authUrl = $state('')

  async function after() {
    const pk = session.pubkey!
    await refreshProfile(pk)
    go(vfs[pk] ? '/' : '/join')
  }
  async function run(fn: () => Promise<unknown>) {
    busy = true
    error = ''
    await new Promise((r) => setTimeout(r, 20))
    try {
      await fn()
      await after()
    } catch (e: any) {
      error = e.message ?? String(e)
    } finally {
      busy = false
    }
  }
  const needNewPw = () => {
    const e = checkPassword(pw) ?? (pw !== pw2 ? 'Passwords do not match' : null)
    if (e) throw new Error(e)
  }
  const device = () => run(() => loginLocal(unlock(chosen, pw)))
  const fromPhrase = () =>
    run(async () => {
      const k = keyFromPhrase(phrase)
      needNewPw()
      await saveAccount(k.sk, pw, k.phrase)
      await loginLocal(k.sk)
    })
  const fromKey = () =>
    run(async () => {
      let sk: Uint8Array
      if (secret.trim().startsWith('ncryptsec')) {
        sk = decryptNcryptsec(secret, pw)
        await saveAccount(sk, pw)
      } else {
        sk = parseSecret(secret)
        needNewPw()
        await saveAccount(sk, pw)
      }
      await loginLocal(sk)
    })
  const ext = () => run(loginNip07)
  const bunk = () => run(() => loginBunker(bunker, (u) => ((authUrl = u), window.open(u, '_blank'))))
  let isNcryptsec = $derived(secret.trim().startsWith('ncryptsec'))
</script>

<div class="box" style="max-width:560px;margin:0 auto">
  <div class="box-h"><span>Login</span></div>
  <div class="box-b">
    <div class="tabs">
      {#if accounts.length}<button class:on={tab === 'device'} onclick={() => (tab = 'device')}>This device</button>{/if}
      <button class:on={tab === 'phrase'} onclick={() => (tab = 'phrase')}>12 words</button>
      <button class:on={tab === 'key'} onclick={() => (tab = 'key')}>nsec / ncryptsec</button>
      <button class:on={tab === 'extension'} onclick={() => (tab = 'extension')}>Extension</button>
      <button class:on={tab === 'bunker'} onclick={() => (tab = 'bunker')}>Bunker</button>
    </div>

    {#if tab === 'device'}
      <form onsubmit={(e) => (e.preventDefault(), device())}>
        <label for="acct">Account</label>
        {#each accounts as a}
          <label class="inline" style="display:flex;margin:4px 0">
            <input type="radio" bind:group={chosen} value={a.pubkey} />
            <Avatar pubkey={a.pubkey} size={28} link={false} /> {displayName(a.pubkey)} <span class="dim small">{npub(a.pubkey).slice(0, 16)}…</span>
          </label>
        {/each}
        <label for="pw">Password</label>
        <input id="pw" type="password" bind:value={pw} autocomplete="current-password" />
        <div class="row" style="margin-top:6px"><button disabled={busy || !pw}>{busy ? 'Unlocking…' : 'Unlock'}</button></div>
      </form>
    {:else if tab === 'phrase'}
      <form onsubmit={(e) => (e.preventDefault(), fromPhrase())}>
        <label for="ph">Your 12-word backup phrase</label>
        <textarea id="ph" bind:value={phrase} autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="word1 word2 word3 …"></textarea>
        <label for="pw1">New password for this device</label>
        <input id="pw1" type="password" bind:value={pw} autocomplete="new-password" />
        <label for="pw2">Repeat password</label>
        <input id="pw2" type="password" bind:value={pw2} autocomplete="new-password" />
        <div class="row" style="margin-top:6px"><button disabled={busy}>{busy ? 'Restoring…' : 'Restore account'}</button></div>
      </form>
    {:else if tab === 'key'}
      <form onsubmit={(e) => (e.preventDefault(), fromKey())}>
        <div class="warn small">Pasting a raw nsec into websites is risky. Prefer an extension or bunker if you can.</div>
        <label for="sk">nsec or ncryptsec</label>
        <input id="sk" type="password" bind:value={secret} autocomplete="off" />
        <label for="kpw">{isNcryptsec ? 'Password for the ncryptsec' : 'New password for this device'}</label>
        <input id="kpw" type="password" bind:value={pw} autocomplete="new-password" />
        {#if !isNcryptsec}
          <label for="kpw2">Repeat password</label>
          <input id="kpw2" type="password" bind:value={pw2} autocomplete="new-password" />
        {/if}
        <p class="dim small">Keys imported this way have no 12-word phrase, so back up the nsec yourself.</p>
        <div class="row"><button disabled={busy || !secret}>{busy ? 'Logging in…' : 'Log in'}</button></div>
      </form>
    {:else if tab === 'extension'}
      <p>Use a NIP-07 browser extension such as Alby, nos2x or Keys.band. Your key never touches this site.</p>
      <button onclick={ext} disabled={busy}>{busy ? 'Waiting for extension…' : 'Log in with extension'}</button>
    {:else}
      <form onsubmit={(e) => (e.preventDefault(), bunk())}>
        <p>Connect a NIP-46 remote signer (nsec.app, Amber, nsecBunker).</p>
        <label for="bk">bunker:// URL or NIP-05 address</label>
        <input id="bk" bind:value={bunker} placeholder="bunker://… or name@nsec.app" />
        <div class="row" style="margin-top:6px"><button disabled={busy || !bunker}>{busy ? 'Connecting… approve in your signer' : 'Connect'}</button></div>
        {#if authUrl}<p class="small">If nothing opened, <a href={authUrl} target="_blank" rel="noopener">approve here</a>.</p>{/if}
      </form>
    {/if}
    {#if error}<div class="err">{error}</div>{/if}
    <hr />
    <p class="dim">New here? <a href={href('/join')}>Create an account</a>.</p>
  </div>
</div>
