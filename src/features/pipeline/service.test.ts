import { beforeEach, describe, expect, it } from 'vitest'
import { archiveCycle, createApplication, createCompany, createCycle, createPosition } from '../../db/repositories'
import { db } from '../../db/schema'
import { createDefaultPipeline } from '../../lib/constants'
import { resetDatabase } from '../../test/db'
import { changeApplicationStage, copyPipeline, updateApplicationPipeline } from './service'

describe('招聘流程与不可变历史', () => {
  beforeEach(resetDatabase)

  it('创建投递时生成默认流程和创建历史', async () => {
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

  it('阶段改名和插入新阶段不会改变既有历史快照', async () => {
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


  it('归档招聘季禁止继续推进投递流程', async () => {
    const cycle = await createCycle({ name: '2027 春招', type: 'spring', startDate: '', endDate: '', notes: '' })
    const company = await createCompany({ name: '星河科技', websiteUrl: '', careerUrl: '', notes: '' })
    const position = await createPosition({ cycleId: cycle.id, companyId: company.id, title: '后端开发', locations: [] })
    const application = await createApplication({ cycleId: cycle.id, positionId: position.id })
    await archiveCycle(cycle.id)
    await expect(changeApplicationStage(application.id, application.pipeline[1].id)).rejects.toThrow('已归档')
  })

  it('复制流程只复制阶段定义并生成新 ID', () => {
    const original = createDefaultPipeline()
    const copied = copyPipeline(original)
    expect(copied.map((stage) => stage.name)).toEqual(original.map((stage) => stage.name))
    expect(copied.map((stage) => stage.id)).not.toEqual(original.map((stage) => stage.id))
  })
})
