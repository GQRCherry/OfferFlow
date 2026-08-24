import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveLLMSecret } from '../../security/secrets'
import { resetDatabase } from '../../test/db'
import type { LLMProviderConfig } from '../../types/domain'
import { parseJD } from './service'

const provider: LLMProviderConfig = {
  id: 'provider-1',
  name: '测试服务',
  providerType: 'openai_compatible',
  baseUrl: 'https://example.com/v1',
  model: 'test-model',
  isDefault: true,
  createdAt: '2026-08-24T00:00:00.000Z',
  updatedAt: '2026-08-24T00:00:00.000Z',
}

beforeEach(async () => {
  await resetDatabase()
  await saveLLMSecret(provider.id, 'test-key')
})
afterEach(() => vi.restoreAllMocks())

describe('JD 提纯服务', () => {
  it('服务商不支持 response_format 时自动回退到 JSON-only 请求', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('unsupported response_format', { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ locations: ['上海'], responsibilities: ['开发服务'], requirements: [], preferred: [], keywords: ['Java'], other: [] }) } }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await parseJD(provider, '招聘后端开发工程师')

    expect(result.locations).toEqual(['上海'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toHaveProperty('response_format')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).not.toHaveProperty('response_format')
  })

  it('输出不是合法结构时不返回伪造数据', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '不是 JSON' } }] }), { status: 200 })))
    await expect(parseJD(provider, '原始 JD')).rejects.toThrow('模型输出解析失败')
  })
})
