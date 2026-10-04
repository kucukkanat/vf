<script lang="ts">
  import Avatar from '../components/Avatar.svelte'
  import { session, loginLocal, logout } from '../lib/auth/session.svelte'
  import { unlock } from '../lib/auth/keystore'
  import { displayName } from '../lib/models/profiles.svelte'
  import { href } from '../lib/router.svelte'
  let pw = $state('')
  let error = $state('')
  let busy = $state(false)
  async function submit(e: SubmitEvent) {
    e.preventDefault()
    busy = true
    error = ''
    await new Promise((r) => setTimeout(r, 20))
    try {
      await loginLocal(unlock(session.locked!, pw))
    } catch (err: any) {
      error = err.message
    } finally {
      busy = false
    }
  }
</script>

<div class="age-gate box">
  <div class="box-h"><span>Welcome back</span></div>
  <div class="box-b">
    <div class="row" style="justify-content:center;margin-bottom:8px">
      <Avatar pubkey={session.locked!} size={60} link={false} />
      <b style="font-size:14px">{displayName(session.locked!)}</b>
    </div>
    <form onsubmit={submit}>
      <input type="password" placeholder="Your password" bind:value={pw} autocomplete="current-password" />
      <div class="row" style="justify-content:center;margin-top:6px">
        <button disabled={busy || !pw}>{busy ? 'Unlocking…' : 'Unlock'}</button>
        <button type="button" class="alt" onclick={logout}>Not you?</button>
      </div>
    </form>
    {#if error}<div class="err">{error}</div>{/if}
    <p class="small dim">Forgot your password? <a href={href('/login?tab=phrase')}>Restore with your 12 words</a>.</p>
  </div>
</div>
