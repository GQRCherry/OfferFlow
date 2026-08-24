import { describe, expect, it } from 'vitest'
import { structuredJDSchema } from './schema'

describe('StructuredJD schema', () => {
  it('fills missing arrays and rejects invalid fields', () => {
    expect(structuredJDSchema.parse({ title: '后端开发' })).toMatchObject({ locations: [], responsibilities: [], requirements: [], preferred: [], keywords: [], other: [] })
    expect(() => structuredJDSchema.parse({ locations: '上海' })).toThrow()
  })
})
