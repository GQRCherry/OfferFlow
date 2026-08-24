import { db } from '../../db/schema'
import { nowIso, uid } from '../../lib/utils'
import { saveLLMSecret } from '../../security/secrets'
import type { LLMProviderConfig } from '../../types/domain'

export async function saveProviderConfig(input: {
  name: string
  baseUrl: string
  model: string
  apiKey: string
  storage: 'local' | 'session'
}, existing?: LLMProviderConfig) {
  const timestamp = nowIso()
  const id = existing?.id ?? uid()
  const provider: LLMProviderConfig = {
    id,
    name: input.name.trim() || '兼容 OpenAI 的服务商',
    providerType: 'openai_compatible',
    baseUrl: input.baseUrl.trim().replace(/\/$/, ''),
    model: input.model.trim(),
    apiKeyRef: input.storage === 'local' ? id : undefined,
    isDefault: true,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  const others = await db.llmProviderConfigs.toArray()
  await db.transaction('rw', db.llmProviderConfigs, async () => {
    await db.llmProviderConfigs.bulkPut(others.map((item) => ({ ...item, isDefault: item.id === id })))
    await db.llmProviderConfigs.put(provider)
  })
  if (input.storage === 'local' && input.apiKey) {
    sessionStorage.removeItem(`offerflow.llm.${id}`)
    await saveLLMSecret(id, input.apiKey)
  } else if (input.storage === 'session') {
    sessionStorage.setItem(`offerflow.llm.${id}`, input.apiKey)
    await db.llmSecrets.delete(id)
  }
  return provider
}
