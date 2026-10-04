// Local in-memory Nostr relay + Blossom server for development and e2e tests.
// Usage: node scripts/mock-relay.mjs [port]   (relay ws://localhost:PORT, blossom http://localhost:PORT)
import http from 'node:http'
import crypto from 'node:crypto'
import { WebSocketServer } from 'ws'
import { matchFilter, verifyEvent } from 'nostr-tools'

const port = Number(process.argv[2] ?? 7777)
const events = []
const blobs = new Map()
const subs = new Map() // ws -> Map<subId, filters>

const isReplaceable = (k) => k === 0 || k === 3 || (k >= 10000 && k < 20000)
const isAddressable = (k) => k >= 30000 && k < 40000
const dTag = (e) => e.tags.find((t) => t[0] === 'd')?.[1] ?? ''

function store(e) {
  if (events.some((x) => x.id === e.id)) return false
  if (e.kind === 5) {
    const ids = e.tags.filter((t) => t[0] === 'e').map((t) => t[1])
    for (let i = events.length - 1; i >= 0; i--) if (ids.includes(events[i].id) && events[i].pubkey === e.pubkey) events.splice(i, 1)
  }
  if (isReplaceable(e.kind) || isAddressable(e.kind)) {
    const same = (x) => x.kind === e.kind && x.pubkey === e.pubkey && (!isAddressable(e.kind) || dTag(x) === dTag(e))
    const prev = events.find(same)
    if (prev && prev.created_at > e.created_at) return true
    if (prev) events.splice(events.indexOf(prev), 1)
  }
  if (e.kind >= 20000 && e.kind < 30000) return true
  events.push(e)
  return true
}

function matches(filters, e) {
  return filters.some((f) => {
    const { search, ...rest } = f
    if (!matchFilter(rest, e)) return false
    if (search && !e.content.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, HEAD, OPTIONS, DELETE')
  if (req.method === 'OPTIONS') return res.end()
  if (req.method === 'PUT' && (req.url === '/upload' || req.url === '/mirror')) {
    const chunks = []
    for await (const c of req) chunks.push(c)
    let buf = Buffer.concat(chunks)
    let type = req.headers['content-type'] ?? 'application/octet-stream'
    if (req.url === '/mirror') {
      const { url } = JSON.parse(buf.toString())
      const b = blobs.get(url.split('/').pop())
      if (!b) return (res.statusCode = 404), res.end()
      buf = b.buf
      type = b.type
    }
    const sha = crypto.createHash('sha256').update(buf).digest('hex')
    blobs.set(sha, { buf, type })
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ url: `http://localhost:${port}/${sha}`, sha256: sha, size: buf.length, type, uploaded: Math.floor(Date.now() / 1000) }))
  }
  const sha = req.url.slice(1).split('.')[0]
  const b = blobs.get(sha)
  if (b) {
    res.setHeader('Content-Type', b.type)
    return res.end(b.buf)
  }
  if (req.headers.accept === 'application/nostr+json') return res.end(JSON.stringify({ name: 'mock', supported_nips: [1, 9, 11, 50] }))
  res.statusCode = 404
  res.end('not found')
})

const wss = new WebSocketServer({ server })
wss.on('connection', (ws) => {
  subs.set(ws, new Map())
  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }
    const [type, ...rest] = msg
    if (type === 'EVENT') {
      const e = rest[0]
      if (!verifyEvent(e)) return ws.send(JSON.stringify(['OK', e.id, false, 'invalid: bad signature']))
      store(e)
      ws.send(JSON.stringify(['OK', e.id, true, '']))
      for (const [client, m] of subs) for (const [id, filters] of m) if (matches(filters, e)) client.send(JSON.stringify(['EVENT', id, e]))
    } else if (type === 'REQ') {
      const [id, ...filters] = rest
      subs.get(ws).set(id, filters)
      const out = events.filter((e) => matches(filters, e)).sort((a, b) => b.created_at - a.created_at)
      const limit = Math.max(...filters.map((f) => f.limit ?? 500))
      for (const e of out.slice(0, limit)) ws.send(JSON.stringify(['EVENT', id, e]))
      ws.send(JSON.stringify(['EOSE', id]))
    } else if (type === 'CLOSE') {
      subs.get(ws).delete(rest[0])
    }
  })
  ws.on('close', () => subs.delete(ws))
})

server.listen(port, () => console.log(`mock relay + blossom on :${port}`))
