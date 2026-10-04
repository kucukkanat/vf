<script lang="ts">
  import { APP_NAME, DEFAULT_RELAYS } from '../config'
</script>

<div class="box" style="max-width:720px;margin:0 auto">
  <div class="box-h"><span>About {APP_NAME}</span></div>
  <div class="box-b">
    <p><b>{APP_NAME}</b> is a fan-made tribute to the dark alternative social sites of the late 2000s, rebuilt on the open <a href="https://nostr.com" target="_blank" rel="noopener">Nostr</a> protocol. It is <b>not affiliated with VampireFreaks.com</b> or its owners.</p>
    <h3>How it works</h3>
    <p>There is no server. This page is a static app that talks directly to public Nostr relays ({DEFAULT_RELAYS.map((r) => r.replace('wss://', '')).join(', ')}). Your profile, pics, journals and friends are Nostr events signed with your key, so you can take them to any Nostr app.</p>
    <h3>Rules</h3>
    <ul>
      <li>You must be 13 or older. Adult (NSFW) content must be marked with a content warning and is hidden from members under 18.</li>
      <li>No harassment, hate, spam or illegal content. No sexual content involving minors, ever.</li>
      <li>Only upload pics and music you have the right to share.</li>
      <li>Admins can block accounts from this site. They can't delete anything from Nostr, but blocked content won't appear here.</li>
    </ul>
    <h3>Privacy</h3>
    <p>Everything you post (except private messages) is public and permanent on relays. Private messages are end-to-end encrypted with NIP-17. Your birth year and preferences never leave your browser.</p>
  </div>
</div>
