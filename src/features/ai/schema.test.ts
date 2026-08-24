import { describe, expect, it } from 'vitest'
import { structuredJDSchema } from './schema'

describe('结构化 JD 数据校验', () => {
  it('自动补齐缺失数组并拒绝错误字段类型', () => {
    expect(structuredJDSchema.parse({ title: '后端开发' })).toMatchObject({ locations: [], responsibilities: [], requirements: [], preferred: [], keywords: [], other: [] })
    expect(() => structuredJDSchema.parse({ locations: '上海' })).toThrow()
  })
})
