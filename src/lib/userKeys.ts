/**
 * Encryption key management for assessor accounts.
 *
 * Each assessor has a single random Encryption Key (EK) that encrypts all their data.
 * The EK is stored on the server in two locked forms:
 *   1. Locked with their password (for normal login)
 *   2. Locked with a recovery key (in case they forget their password)
 * The recovery key itself is stored on the server locked with our master key.
 *
 * The EK is NEVER stored in plain form — only in memory during an active session.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length)) as Uint8Array<ArrayBuffer>
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(str: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
}

type Buf = Uint8Array<ArrayBuffer>

async function deriveKeyFromPassword(password: string, salt: Buf): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const raw = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encryptBytes(key: CryptoKey, data: Buf): Promise<string> {
  const iv = randomBytes(12)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  return toBase64(combined)
}

async function decryptBytes(key: CryptoKey, encoded: string): Promise<Buf> {
  const combined = fromBase64(encoded)
  const iv = combined.slice(0, 12) as Buf
  const data = combined.slice(12) as Buf
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new Uint8Array(decrypted) as Buf
}

// ── Recovery key generation ───────────────────────────────────────────────────

const RECOVERY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion

export function generateRecoveryKey(): string {
  const bytes = randomBytes(32)
  let key = ''
  for (let i = 0; i < 32; i++) {
    key += RECOVERY_CHARS[bytes[i] % RECOVERY_CHARS.length]
    if (i > 0 && i % 8 === 7 && i < 31) key += '-'
  }
  return key // format: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
}

// ── Key bundle creation (first login) ────────────────────────────────────────

export interface KeyBundle {
  encryptedKey: string
  passwordSalt: string
  recoveryEncryptedKey: string
  recoverySalt: string
  recoveryKey: string // plain — shown to user once, then sent to server to be master-encrypted
}

export async function createKeyBundle(password: string): Promise<{ bundle: KeyBundle; ek: CryptoKey }> {
  // Generate a fresh random encryption key
  const ek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const ekBytes = new Uint8Array(await crypto.subtle.exportKey('raw', ek))

  // Lock EK with password
  const passwordSalt = randomBytes(16)
  const passwordKey = await deriveKeyFromPassword(password, passwordSalt)
  const encryptedKey = await encryptBytes(passwordKey, ekBytes)

  // Lock EK with recovery key
  const recoveryKey = generateRecoveryKey()
  const recoverySalt = randomBytes(16)
  const recoveryDerivedKey = await deriveKeyFromPassword(recoveryKey, recoverySalt)
  const recoveryEncryptedKey = await encryptBytes(recoveryDerivedKey, ekBytes)

  return {
    bundle: {
      encryptedKey,
      passwordSalt: toBase64(passwordSalt),
      recoveryEncryptedKey,
      recoverySalt: toBase64(recoverySalt),
      recoveryKey,
    },
    ek,
  }
}

// ── Key unlock (normal login) ─────────────────────────────────────────────────

export async function unlockKeyWithPassword(
  encryptedKey: string,
  passwordSalt: string,
  password: string,
): Promise<CryptoKey> {
  const salt = fromBase64(passwordSalt)
  const passwordKey = await deriveKeyFromPassword(password, salt)
  const ekBytes = await decryptBytes(passwordKey, encryptedKey)
  return crypto.subtle.importKey('raw', ekBytes, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

// ── Key unlock (recovery) ─────────────────────────────────────────────────────

export async function unlockKeyWithRecovery(
  recoveryEncryptedKey: string,
  recoverySalt: string,
  recoveryKey: string,
): Promise<CryptoKey> {
  const salt = fromBase64(recoverySalt)
  const recoveryDerivedKey = await deriveKeyFromPassword(recoveryKey, salt)
  const ekBytes = await decryptBytes(recoveryDerivedKey, recoveryEncryptedKey)
  return crypto.subtle.importKey('raw', ekBytes, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
