<script lang="ts">
  import { newPhrase, confirmIndices, saveAccount, checkPassword, backupText, getAccount } from '../lib/auth/keystore'
  import { loginLocal, session } from '../lib/auth/session.svelte'
  import { saveProfile } from '../lib/models/profiles.svelte'
  import { go, href } from '../lib/router.svelte'
  import { npub } from '../lib/nostr/util'
  import { APP_NAME, SCENES } from '../config'

  let step = $state<'intro' | 'words' | 'confirm' | 'password' | 'profile'>(session.pubkey ? 'profile' : 'intro')
  let acct = $state<ReturnType<typeof newPhrase> | null>(null)
  let words = $derived(acct ? acct.phrase.split(' ') : [])
  let checks = $state<number[]>([])
  let answers = $state<string[]>(['', '', ''])
  let pw = $state('')
  let pw2 = $state('')
  let error = $state('')
  let busy = $state(false)
  let wroteDown = $state(false)

  let name = $state('')
  let location = $state('')
  let gender = $state('')
  let headline = $state('')
  let scenes = $state<string[]>([])

  function start() {
    acct = newPhrase()
    checks = confirmIndices()
    answers = ['', '', '']
    step = 'words'
  }
  function confirm(e: SubmitEvent) {
    e.preventDefault()
    const bad = checks.some((idx, i) => answers[i].trim().toLowerCase() !== words[idx])
    if (bad) {
      error = "Those words don't match. Check your backup and try again."
      return
    }
    error = ''
    step = 'password'
  }
  async function setPassword(e: SubmitEvent) {
    e.preventDefault()
    error = checkPassword(pw) ?? (pw !== pw2 ? 'Passwords do not match' : '')
    if (error || !acct) return
    busy = true
    await new Promise((r) => setTimeout(r, 20))
    try {
      await saveAccount(acct.sk, pw, acct.phrase)
      await loginLocal(acct.sk)
      step = 'profile'
    } catch (err: any) {
      error = err.message
    } finally {
      busy = false
    }
  }
  function download() {
    if (!acct) return
    const a = getAccount(acct.pubkey)
    const text = backupText(APP_NAME, npub(acct.pubkey), acct.phrase, a?.ncryptsec ?? '')
    const el = document.createElement('a')
    el.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    el.download = `${APP_NAME}-backup-${npub(acct.pubkey).slice(0, 12)}.txt`
    el.click()
  }
  async function finish(e: SubmitEvent) {
    e.preventDefault()
    if (!name.trim()) {
      error = 'Pick a name'
      return
    }
    busy = true
    error = ''
    try {
      await saveProfile(session.pubkey!, { name: name.trim(), display_name: name.trim() }, {
        headline, location, gender, scenes, bands: '', mood: '', song: null,
      })
      acct = null
      go('/u/' + npub(session.pubkey!))
    } catch (err: any) {
      error = err.message
    } finally {
      busy = false
    }
  }
</script>

<div class="cols-r">
  <div class="box">
    <div class="box-h"><span>Join {APP_NAME}</span><span class="small">step {['intro', 'words', 'confirm', 'password', 'profile'].indexOf(step) + 1} / 5</span></div>
    <div class="box-b">
      {#if step === 'intro'}
        <h2>Create your account</h2>
        <p>{APP_NAME} runs on <b>Nostr</b>. There are no usernames or emails. Your account is a cryptographic key that only you hold.</p>
        <p>We'll give you a <b>12-word backup phrase</b>. Write it down on paper. It is the only way to recover your account on a new device. It also works in other Nostr apps.</p>
        <div class="warn">Nobody, not even the admins, can reset your account. Lose both your 12 words and your password and the account is gone forever.</div>
        <div class="row"><button onclick={start}>Create my key</button> <span class="dim">Already on Nostr? <a href={href('/login')}>Log in instead</a>.</span></div>
      {:else if step === 'words'}
        <h2>Your 12-word backup phrase</h2>
        <p>Write these words down <b>in order</b> and keep them somewhere safe. Never share them with anyone.</p>
        <div class="words">{#each words as w, i}<div><b>{i + 1}.</b>{w}</div>{/each}</div>
        <div class="row">
          <button class="alt small" onclick={() => navigator.clipboard?.writeText(acct!.phrase)}>Copy</button>
          <span class="dim small">Paper is safer than your clipboard.</span>
        </div>
        <label class="inline" style="margin-top:8px"><input type="checkbox" bind:checked={wroteDown} /> I wrote down all 12 words</label>
        <div class="row" style="margin-top:6px">
          <button disabled={!wroteDown} onclick={() => (step = 'confirm')}>Next</button>
          <button class="alt" onclick={start}>Generate different words</button>
        </div>
      {:else if step === 'confirm'}
        <h2>Prove you wrote them down</h2>
        <form onsubmit={confirm}>
          {#each checks as idx, i}
            <label for={'w' + i}>Word #{idx + 1}</label>
            <input id={'w' + i} bind:value={answers[i]} autocomplete="off" autocapitalize="off" spellcheck="false" />
          {/each}
          {#if error}<div class="err">{error}</div>{/if}
          <div class="row" style="margin-top:6px"><button>Confirm</button><button type="button" class="alt" onclick={() => (step = 'words')}>Show words again</button></div>
        </form>
      {:else if step === 'password'}
        <h2>Pick a password</h2>
        <p>Your key is stored on this device, encrypted with this password (NIP-49). You'll use it to log in here day to day.</p>
        <form onsubmit={setPassword}>
          <label for="pw">Password (8+ characters)</label>
          <input id="pw" type="password" bind:value={pw} autocomplete="new-password" />
          <label for="pw2">Repeat password</label>
          <input id="pw2" type="password" bind:value={pw2} autocomplete="new-password" />
          {#if error}<div class="err">{error}</div>{/if}
          <div class="row" style="margin-top:6px"><button disabled={busy}>{busy ? 'Encrypting…' : 'Save & continue'}</button></div>
        </form>
      {:else}
        <h2>Set up your profile</h2>
        {#if acct}
          <div class="ok">Account created! <button class="link" onclick={download}>Download a backup file</button> (12 words + encrypted key) and keep it safe.</div>
        {/if}
        <form onsubmit={finish}>
          <label for="nm">Display name</label>
          <input id="nm" bind:value={name} maxlength="50" placeholder="xXDarkAngelXx" />
          <label for="hl">Headline</label>
          <input id="hl" bind:value={headline} maxlength="140" placeholder="the night is my canvas" />
          <div class="row">
            <div class="grow"><label for="loc">Location</label><input id="loc" bind:value={location} maxlength="80" placeholder="Gotham, NJ" /></div>
            <div class="grow"><label for="gd">Gender</label><input id="gd" bind:value={gender} maxlength="40" /></div>
          </div>
          <span class="dim small">Your age is never published.</span>
          <span class="label">Scenes</span>
          <div>{#each SCENES as s}<label class="inline"><input type="checkbox" value={s} bind:group={scenes} /> {s}</label>{/each}</div>
          {#if error}<div class="err">{error}</div>{/if}
          <div class="row" style="margin-top:8px"><button disabled={busy}>{busy ? 'Publishing…' : 'Enter the crypt'}</button></div>
        </form>
      {/if}
    </div>
  </div>
  <div>
    <div class="box">
      <div class="box-h"><span>Why Nostr?</span></div>
      <div class="box-b small">
        <p>• No company owns your profile. It's signed by your key and stored on public relays.</p>
        <p>• Your friends, pics and journals work in any Nostr app.</p>
        <p>• No ads, no tracking, no servers to shut down.</p>
      </div>
    </div>
  </div>
</div>
