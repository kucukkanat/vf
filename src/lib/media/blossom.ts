// Blossom media uploads (BUD-01/02) with mirroring (BUD-04).
import { DEFAULT_BLOSSOM } from '../../config'
import { getReplaceable } from '../nostr/cache'
import { query } from '../nostr/pool'
import { sign } from '../nostr/publish'
import { now, tagValues, uniq } from '../nostr/util'

export interface Blob {
  url: string
  sha256: string
  size: number
  type: string
  mirrors: string[]
}

export async function sha256Hex(data: ArrayBuffer) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', data))
  return [...h].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function authHeader(verb: 'upload' | 'delete', sha: string, content: string) {
  const ev = await sign(
    { kind: 24242, content, tags: [['t', verb], ['x', sha], ['expiration', String(now() + 600)]] },
    { appTag: false },
  )
  return 'Nostr ' + btoa(JSON.stringify(ev))
}

export async function serversFor(pubkey: string | null): Promise<string[]> {
  let mine: string[] = []
  if (pubkey) {
    await query({ kinds: [10063], authors: [pubkey] }, { maxWait: 2500 })
    const e = getReplaceable(10063, pubkey)
    if (e) mine = tagValues(e, 'server')
  }
  return uniq([...mine, ...DEFAULT_BLOSSOM].map((s) => s.replace(/\/+$/, '')).filter((s) => /^https:\/\/|^http:\/\/localhost[:/]/.test(s)))
}

/** Uploads to the first server that accepts the file, then mirrors to one more. */
export async function upload(file: File, pubkey: string | null, onStatus?: (s: string) => void): Promise<Blob> {
  const buf = await file.arrayBuffer()
  const sha = await sha256Hex(buf)
  const servers = await serversFor(pubkey)
  const errors: string[] = []
  for (let i = 0; i < servers.length; i++) {
    const server = servers[i]
    try {
      onStatus?.(`Uploading to ${new URL(server).host}…`)
      const res = await fetch(server + '/upload', {
        method: 'PUT',
        headers: {
          Authorization: await authHeader('upload', sha, `Upload ${file.name}`),
          'Content-Type': file.type || 'application/octet-stream',
          'X-SHA-256': sha,
        },
        body: buf,
      })
      if (!res.ok) throw new Error(`${res.status} ${res.headers.get('X-Reason') ?? res.statusText}`)
      const desc = await res.json()
      const blob: Blob = { url: desc.url, sha256: desc.sha256 ?? sha, size: desc.size ?? file.size, type: desc.type ?? file.type, mirrors: [] }
      if (blob.sha256 !== sha) throw new Error('server returned a different hash')
      for (const m of servers.slice(i + 1, i + 2)) {
        try {
          onStatus?.(`Mirroring to ${new URL(m).host}…`)
          const r = await fetch(m + '/mirror', {
            method: 'PUT',
            headers: { Authorization: await authHeader('upload', sha, 'Mirror'), 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: blob.url }),
          })
          if (r.ok) blob.mirrors.push((await r.json()).url)
        } catch {}
      }
      onStatus?.('')
      return blob
    } catch (e: any) {
      errors.push(`${new URL(server).host}: ${e.message ?? e}`)
    }
  }
  onStatus?.('')
  throw new Error('Upload failed on all servers. ' + errors.join(' | '))
}

export function imageSize(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}
