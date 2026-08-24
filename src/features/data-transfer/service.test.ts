import { beforeEach, describe, expect, it } from 'vitest'
import { createApplication, createCompany, createCycle, createPosition } from '../../db/repositories'
import { db } from '../../db/schema'
import { resetDatabase } from '../../test/db'
import { saveCareerAccountSecret, saveLLMSecret } from '../../security/secrets'
import { createExportBundle, importBundle, parseImportBundle } from './service'
import { nowIso } from '../../lib/utils'

describe('data export and import', () => {
  beforeEach(resetDatabase)

  it('never includes career account secrets or LLM API keys in normal export', async () => {
    const cycle = await createCycle({ name: '2027 春招', type: 'spring', startDate: '', endDate: '', notes: '' })
    const company = await createCompany({ name: '星河科技', websiteUrl: '', careerUrl: '', notes: '' })
    const timestamp = nowIso()
    await db.careerAccounts.add({ id: 'account-1', companyId: company.id, label: '校招官网', loginMethods: ['phone'], wechatEnabled: false, createdAt: timestamp, updatedAt: timestamp })
    await saveCareerAccountSecret('account-1', { phone: '13800000000', password: 'never-export-me' })
    await db.llmProviderConfigs.add({ id: 'provider-1', name: 'Test', providerType: 'openai_compatible', baseUrl: 'https://example.com/v1', model: 'test-model', apiKeyRef: 'provider-1', isDefault: true, createdAt: timestamp, updatedAt: timestamp })
    await saveLLMSecret('provider-1', 'sk-secret-value')
    await createPosition({ cycleId: cycle.id, companyId: company.id, title: '后端开发', locations: [] })

    const serialized = JSON.stringify(await createExportBundle())
    expect(serialized).not.toContain('never-export-me')
    expect(serialized).not.toContain('13800000000')
    expect(serialized).not.toContain('sk-secret-value')
    expect(serialized).not.toContain('apiKeyRef')
  })

  it('round-trips ordinary data with references intact', async () => {
    const cycle = await createCycle({ name: '2027 春招', type: 'spring', startDate: '', endDate: '', notes: '' })
    const company = await createCompany({ name: '星河科技', websiteUrl: '', careerUrl: '', notes: '' })
    const position = await createPosition({ cycleId: cycle.id, companyId: company.id, title: '后端开发', locations: ['上海'] })
    await createApplication({ cycleId: cycle.id, positionId: position.id })
    const bundle = parseImportBundle(JSON.stringify(await createExportBundle()))

    await Promise.all([db.recruitmentCycles.clear(), db.companies.clear(), db.positions.clear(), db.applications.clear(), db.applicationStageHistory.clear()])
    await importBundle(bundle, 'replace')

    expect(await db.recruitmentCycles.count()).toBe(1)
    expect(await db.positions.get(position.id)).toMatchObject({ cycleId: cycle.id, companyId: company.id })
    const application = await db.applications.where('positionId').equals(position.id).first()
    expect(application?.pipeline.some((stage) => stage.id === application.currentStageId)).toBe(true)
  })
})
