import type { ExpressLearnerRecord, ImportedQuestionnaire } from '../types'

export interface SyncPayload {
  records: ExpressLearnerRecord[]
  questionnaires: ImportedQuestionnaire[]
  updatedAt: string
}

// ── Encryption helpers ────────────────────────────────────────────────────────

async function encryptPayload(key: CryptoKey, payload: SyncPayload): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(payload))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function decryptPayload(key: CryptoKey, encoded: string): Promise<SyncPayload> {
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return JSON.parse(new TextDecoder().decode(decrypted)) as SyncPayload
}

// ── Auth token helper ─────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const { supabase } = await import('./supabase')
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadSync(key: CryptoKey, payload: SyncPayload): Promise<void> {
  const token = await getToken()
  if (!token) return

  const encryptedData = await encryptPayload(key, payload)

  await fetch('/api/sync', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ encryptedData, updatedAt: payload.updatedAt }),
  })
}

// ── Download ──────────────────────────────────────────────────────────────────

export async function downloadSync(key: CryptoKey): Promise<SyncPayload | null> {
  const token = await getToken()
  if (!token) return null

  const res = await fetch('/api/sync', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json() as { exists: boolean; encryptedData?: string }

  if (!data.exists || !data.encryptedData) return null

  try {
    return await decryptPayload(key, data.encryptedData)
  } catch {
    return null
  }
}
