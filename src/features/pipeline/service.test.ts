import { beforeEach, describe, expect, it } from 'vitest'
import { createApplication, createCompany, createCycle, createPosition } from '../../db/repositories'
import { db } from '../../db/schema'
import { createDefaultPipeline } from '../../lib/constants'
import { resetDatabase } from '../../test/db'
import { changeApplicationStage, copyPipeline, updateApplicationPipeline } from './service'

describe('pipeline and immutable history', () => {
  beforeEach(resetDatabase)

  it('creates an application with default pipeline and created history', async () => {
    const cycle = await createCycle({ name: '2027 春招', type: 'spring', startDate: '', endDate: '', notes: '' })
    const company = await createCompany({ name: '星河科技', websiteUrl: '', careerUrl: '', notes: '' })
    const position = await createPosition({ cycleId: cycle.id, companyId: company.id, title: '后端开发', locations: ['上海'] })
    const application = await createApplication({ cycleId: cycle.id, positionId: position.id })
    const history = await db.applicationStageHistory.where('applicationId').equals(application.id).toArray()

    expect(application.pipeline).toHaveLength(10)
    expect(application.pipeline[0].name).toBe('待投递')
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ action: 'created', toStageNameSnapshot: '待投递', toCategorySnapshot: 'todo' })
  })

  it('keeps history snapshots unchanged after a stage is renamed and a new stage is inserted', async () => {
    const cycle = await createCycle({ name: '2027 春招', type: 'spring', startDate: '', endDate: '', notes: '' })
    const company = await createCompany({ name: '星河科技', websiteUrl: '', careerUrl: '', notes: '' })
    const position = await createPosition({ cycleId: cycle.id, companyId: company.id, title: '后端开发', locations: [] })
    const application = await createApplication({ cycleId: cycle.id, positionId: position.id })
    const interview = application.pipeline.find((stage) => stage.name === '二面')!
    await changeApplicationStage(application.id, interview.id)
    const renamed = application.pipeline.map((stage) => stage.id === interview.id ? { ...stage, name: '技术终面' } : stage)
    const managerStage = { id: crypto.randomUUID(), name: '主管面', category: 'interview' as const, order: 7 }
    await updateApplicationPipeline(application.id, [...renamed.slice(0, 7), managerStage, ...renamed.slice(7)])

    const history = await db.applicationStageHistory.where('applicationId').equals(application.id).toArray()
    const stageChange = history.find((item) => item.action === 'stage_changed')
    expect(stageChange?.toStageNameSnapshot).toBe('二面')
    expect(history.some((item) => item.action === 'stage_inserted' && item.toStageNameSnapshot === '主管面')).toBe(true)
  })

  it('copies stage definitions with new IDs only', () => {
    const original = createDefaultPipeline()
    const copied = copyPipeline(original)
    expect(copied.map((stage) => stage.name)).toEqual(original.map((stage) => stage.name))
    expect(copied.map((stage) => stage.id)).not.toEqual(original.map((stage) => stage.id))
  })
})
