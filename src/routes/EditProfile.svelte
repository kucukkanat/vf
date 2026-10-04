<script lang="ts">
  import Uploader from '../components/Uploader.svelte'
  import Player from '../components/Player.svelte'
  import { session } from '../lib/auth/session.svelte'
  import { metas, vfs, refreshProfile, saveProfile } from '../lib/models/profiles.svelte'
  import { href, go } from '../lib/router.svelte'
  import { npub } from '../lib/nostr/util'
  import { SCENES, MAX_IMAGE_BYTES, MAX_SONG_BYTES } from '../config'

  const pk = session.pubkey
  let f = $state({ name: '', about: '', picture: '', banner: '', website: '', lud16: '', headline: '', location: '', gender: '', bands: '', mood: '', scenes: [] as string[], songUrl: '', songTitle: '' })
  let loaded = $state(false)
  let error = $state('')
  let busy = $state(false)

  async function init() {
    if (!pk) return
    await refreshProfile(pk)
    const m = metas[pk] ?? {}
    const v = vfs[pk]
    f = {
      name: m.display_name || m.name || '', about: m.about ?? '', picture: m.picture ?? '', banner: m.banner ?? '', website: m.website ?? '', lud16: m.lud16 ?? '',
      headline: v?.headline ?? '', location: v?.location ?? '', gender: v?.gender ?? '', bands: v?.bands ?? '', mood: v?.mood ?? '', scenes: v?.scenes ?? [],
      songUrl: v?.song?.url ?? '', songTitle: v?.song?.title ?? '',
    }
    loaded = true
  }
  init()

  async function save(e: SubmitEvent) {
    e.preventDefault()
    busy = true
    error = ''
    try {
      await saveProfile(
        pk!,
        { name: f.name, display_name: f.name, about: f.about, picture: f.picture, banner: f.banner, website: f.website, lud16: f.lud16 },
        { headline: f.headline, location: f.location, gender: f.gender, bands: f.bands, mood: f.mood, scenes: f.scenes, song: f.songUrl ? { url: f.songUrl, title: f.songTitle || 'My song' } : null },
      )
      go('/u/' + npub(pk!))
    } catch (err: any) {
      error = err.message
    } finally {
      busy = false
    }
  }
</script>

{#if !pk}
  <p><a href={href('/login')}>Log in</a> to edit your profile.</p>
{:else if !loaded}
  <p class="loading">Loading your profile<span class="blink">...</span></p>
{:else}
  <form onsubmit={save}>
    <div class="cols-r">
      <div>
        <div class="box"><div class="box-h"><span>Edit profile</span><a href={href('/edit/layout')}>edit layout »</a></div><div class="box-b">
          <label for="n">Display name</label><input id="n" bind:value={f.name} maxlength="50" />
          <label for="h">Headline</label><input id="h" bind:value={f.headline} maxlength="140" />
          <label for="a">About me</label><textarea id="a" bind:value={f.about} rows="8" maxlength="2000"></textarea>
          <div class="row">
            <div class="grow"><label for="l">Location</label><input id="l" bind:value={f.location} maxlength="80" /></div>
            <div class="grow"><label for="g">Gender</label><input id="g" bind:value={f.gender} maxlength="40" /></div>
            <div class="grow"><label for="m">Mood</label><input id="m" bind:value={f.mood} maxlength="60" placeholder="melancholic" /></div>
          </div>
          <label for="b">Favorite bands</label><textarea id="b" bind:value={f.bands} maxlength="1000" placeholder="Skinny Puppy, Bauhaus, Combichrist…"></textarea>
          <span class="label">Scenes</span>
          <div>{#each SCENES as s}<label class="inline"><input type="checkbox" value={s} bind:group={f.scenes} /> {s}</label>{/each}</div>
          <div class="row">
            <div class="grow"><label for="w">Website</label><input id="w" type="url" bind:value={f.website} /></div>
            <div class="grow"><label for="z">Lightning address (for kudos)</label><input id="z" bind:value={f.lud16} placeholder="you@getalby.com" /></div>
          </div>
        </div></div>
      </div>
      <div>
        <div class="box"><div class="box-h"><span>Main pic</span></div><div class="box-b">
          {#if f.picture}<img src={f.picture} alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border:1px solid #444" />{/if}
          <Uploader maxBytes={MAX_IMAGE_BYTES} label="Upload main pic" onuploaded={(b) => (f.picture = b.url)} />
          <input bind:value={f.picture} placeholder="or paste image URL" style="margin-top:4px" />
        </div></div>
        <div class="box"><div class="box-h"><span>Banner</span></div><div class="box-b">
          {#if f.banner}<img src={f.banner} alt="" style="width:100%;max-height:100px;object-fit:cover" />{/if}
          <Uploader maxBytes={MAX_IMAGE_BYTES} label="Upload banner" onuploaded={(b) => (f.banner = b.url)} />
          <input bind:value={f.banner} placeholder="or paste image URL" style="margin-top:4px" />
        </div></div>
        <div class="box"><div class="box-h"><span>Profile song</span></div><div class="box-b">
          {#if f.songUrl}<Player url={f.songUrl} title={f.songTitle} /><button type="button" class="link small" onclick={() => (f.songUrl = '')}>remove song</button>{/if}
          <label for="st">Song title</label><input id="st" bind:value={f.songTitle} maxlength="120" placeholder="Artist - Track" />
          <div style="margin-top:4px">
            <Uploader accept="audio/mpeg,audio/mp3,audio/ogg,audio/*" maxBytes={MAX_SONG_BYTES} label="Upload MP3 (max 10MB)" onuploaded={(b, file) => ((f.songUrl = b.url), f.songTitle || (f.songTitle = file.name.replace(/\.[^.]+$/, '')))} />
          </div>
          <p class="dim small">Only upload music you have the rights to share.</p>
        </div></div>
      </div>
    </div>
    {#if error}<div class="err">{error}</div>{/if}
    <div class="row"><button disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button><a class="btn alt" href={href('/u/' + npub(pk))}>Cancel</a></div>
  </form>
{/if}
