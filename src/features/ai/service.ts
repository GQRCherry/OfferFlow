import { structuredJDSchema } from './schema'
import { readLLMSecret } from '../../security/secrets'
import type { LLMProviderConfig, StructuredJD } from '../../types/domain'

const SYSTEM_PROMPT = `你是招聘岗位信息结构化助手。请忽略网页导航、版权、推荐岗位、广告等噪声；不得编造原文不存在的要求；不要输出散文。只输出一个 JSON 对象，字段为 title、department、locations、responsibilities、requirements、preferred、keywords、education、graduationRequirement、other。缺失数组返回空数组，缺失字符串省略或返回空字符串。keywords 只能来自原文内容。`

function errorMessage(status: number, body: string): string {
  if (status === 401 || status === 403) return '鉴权失败，请检查 API Key。'
  if (status === 404) return '模型或接口不存在，请检查 Base URL 和 Model。'
  if (status === 429) return '请求过于频繁或额度不足，请稍后重试。'
  if (status >= 500) return '模型服务暂时不可用，请稍后重试。'
  return `模型调用失败（${status}）：${body.slice(0, 160)}`
}

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}

async function requestCompletion(endpoint: string, apiKey: string, provider: LLMProviderConfig, rawText: string, structuredOutput: boolean) {
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.1,
      ...(structuredOutput ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: rawText },
      ],
    }),
  })
}

export async function parseJD(provider: LLMProviderConfig, rawText: string): Promise<StructuredJD> {
  const secret = await readLLMSecret(provider.id)
  if (!secret?.apiKey) throw new Error('尚未配置 API Key，请先前往设置。')
  if (!rawText.trim()) throw new Error('请先粘贴 JD 原始文本。')
  const endpoint = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`
  let response: Response
  try {
    response = await requestCompletion(endpoint, secret.apiKey, provider, rawText, true)
    if ([400, 422].includes(response.status)) {
      response = await requestCompletion(endpoint, secret.apiKey, provider, rawText, false)
    }
  } catch {
    throw new Error('网络连接失败，请检查网络、Base URL 或浏览器跨域限制。')
  }
  const body = await response.text()
  if (!response.ok) throw new Error(errorMessage(response.status, body))
  try {
    const json = JSON.parse(body) as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content
    if (!content) throw new Error('模型未返回内容。')
    return structuredJDSchema.parse(extractJson(content))
  } catch (error) {
    if (error instanceof Error && error.message === '模型未返回内容。') throw error
    throw new Error('模型输出解析失败，原始 JD 已保留，请重试或手动编辑。')
  }
}

export async function testConnection(provider: LLMProviderConfig) {
  const secret = await readLLMSecret(provider.id)
  if (!secret?.apiKey) return { ok: false, message: '尚未配置 API Key。' }
  try {
    const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/models`, {
      headers: { Authorization: `Bearer ${secret.apiKey}` },
    })
    if (!response.ok) return { ok: false, message: errorMessage(response.status, await response.text()) }
    return { ok: true, message: '连接成功。' }
  } catch {
    return { ok: false, message: '网络连接失败或服务不允许浏览器跨域访问。' }
  }
}
