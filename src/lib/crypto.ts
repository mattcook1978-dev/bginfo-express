// Derive AES-GCM key from access code using PBKDF2
export async function deriveKey(code: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(code),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // Convert to ArrayBuffer to avoid SharedArrayBuffer type issues
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt data (returns base64 string: iv + ciphertext)
export async function encrypt(key: CryptoKey, data: object): Promise<string> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = encoder.encode(JSON.stringify(data))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  // Combine iv + ciphertext
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)

  return btoa(String.fromCharCode(...combined))
}

// Decrypt data
export async function decrypt(key: CryptoKey, encryptedBase64: string): Promise<object> {
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  const decoder = new TextDecoder()
  return JSON.parse(decoder.decode(decrypted))
}

// Hash a string (SHA-256, returns hex)
export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(code))
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Generate random salt
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

// Convert Uint8Array to base64
export function uint8ToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
}

