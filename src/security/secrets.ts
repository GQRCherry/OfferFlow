import { db } from '../db/schema'
import { nowIso } from '../lib/utils'
import type { CareerAccountSecretPayload, EncryptedSecret } from '../types/domain'

const KEY_STORAGE_NAME = 'offerflow.local-encryption-key.v1'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)))
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function getOrCreateKey(): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) throw new Error('当前浏览器不支持 Web Crypto，无法保存敏感信息。')
  let encoded = localStorage.getItem(KEY_STORAGE_NAME)
  if (!encoded) {
    const raw = crypto.getRandomValues(new Uint8Array(32))
    encoded = toBase64(raw)
    localStorage.setItem(KEY_STORAGE_NAME, encoded)
  }
  return crypto.subtle.importKey('raw', fromBase64(encoded), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encrypt(ownerId: string, value: unknown): Promise<EncryptedSecret> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(value)))
  const existing = await db.careerAccountSecrets.get(ownerId)
  const timestamp = nowIso()
  return {
    id: ownerId,
    ownerId,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
}

async function decrypt<T>(record?: EncryptedSecret): Promise<T | undefined> {
  if (!record) return undefined
  const key = await getOrCreateKey()
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(record.iv) },
      key,
      fromBase64(record.ciphertext),
    )
    return JSON.parse(decoder.decode(decrypted)) as T
  } catch {
    throw new Error('敏感数据无法解密。浏览器本地密钥可能已被清理。')
  }
}

export async function saveCareerAccountSecret(accountId: string, value: CareerAccountSecretPayload) {
  const record = await encrypt(accountId, value)
  await db.careerAccountSecrets.put(record)
}

export async function readCareerAccountSecret(accountId: string) {
  return decrypt<CareerAccountSecretPayload>(await db.careerAccountSecrets.get(accountId))
}

export async function saveLLMSecret(providerId: string, apiKey: string) {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify({ apiKey })))
  const existing = await db.llmSecrets.get(providerId)
  const timestamp = nowIso()
  await db.llmSecrets.put({
    id: providerId,
    ownerId: providerId,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  })
}

export async function readLLMSecret(providerId: string) {
  const sessionValue = sessionStorage.getItem(`offerflow.llm.${providerId}`)
  if (sessionValue) return { apiKey: sessionValue }
  return decrypt<{ apiKey: string }>(await db.llmSecrets.get(providerId))
}

export async function clearAllSecrets() {
  await db.transaction('rw', db.careerAccountSecrets, db.llmSecrets, async () => {
    await db.careerAccountSecrets.clear()
    await db.llmSecrets.clear()
  })
  localStorage.removeItem(KEY_STORAGE_NAME)
  Object.keys(sessionStorage).filter((key) => key.startsWith('offerflow.llm.')).forEach((key) => sessionStorage.removeItem(key))
}
