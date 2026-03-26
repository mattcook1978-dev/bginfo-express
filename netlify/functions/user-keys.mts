import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY!

// ── Master key encryption (Node.js crypto) ────────────────────────────────────

async function masterEncrypt(plaintext: string): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(MASTER_KEY.padEnd(32).slice(0, 32)),
    { name: 'AES-GCM' }, false, ['encrypt'],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    enc.encode(plaintext),
  )
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function masterDecrypt(encoded: string): Promise<string> {
  const enc = new TextEncoder()
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(MASTER_KEY.padEnd(32).slice(0, 32)),
    { name: 'AES-GCM' }, false, ['decrypt'],
  )
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyMaterial, data)
  return new TextDecoder().decode(decrypted)
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: Request, context: Context) {
  // Verify the user's Supabase JWT
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return new Response('Unauthorised', { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return new Response('Unauthorised', { status: 401 })

  const userId = user.id

  // POST — save a new key bundle (first login only)
  if (req.method === 'POST') {
    const body = await req.json() as {
      encryptedKey: string
      passwordSalt: string
      recoveryEncryptedKey: string
      recoverySalt: string
      recoveryKey: string
    }

    // Check keys don't already exist
    const { data: existing } = await supabase
      .from('user_keys')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (existing) return new Response('Keys already exist', { status: 409 })

    // Master-encrypt the recovery key server-side
    const masterEncryptedRecovery = await masterEncrypt(body.recoveryKey)

    const { error } = await supabase.from('user_keys').insert({
      user_id: userId,
      encrypted_key: body.encryptedKey,
      password_salt: body.passwordSalt,
      recovery_encrypted_key: body.recoveryEncryptedKey,
      recovery_salt: body.recoverySalt,
      master_encrypted_recovery: masterEncryptedRecovery,
    })

    if (error) return new Response('Failed to save keys', { status: 500 })
    return new Response('OK', { status: 200 })
  }

  // GET — fetch key bundle for login
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('user_keys')
      .select('encrypted_key, password_salt, recovery_encrypted_key, recovery_salt')
      .eq('user_id', userId)
      .single()

    if (error || !data) return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

    return new Response(JSON.stringify({ exists: true, ...data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // GET recovery key (assessor has lost it — identity already verified manually)
  // Called by you (the admin) via a separate process — not exposed to assessors
  if (req.method === 'PATCH') {
    const { data, error } = await supabase
      .from('user_keys')
      .select('master_encrypted_recovery')
      .eq('user_id', userId)
      .single()

    if (error || !data) return new Response('Not found', { status: 404 })

    const recoveryKey = await masterDecrypt(data.master_encrypted_recovery)
    return new Response(JSON.stringify({ recoveryKey }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/user-keys' }
