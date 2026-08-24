import { db } from '../../db/schema'
import { assertCycleWritable } from '../../db/repositories'
import { nowIso, uid } from '../../lib/utils'
import type { Application, ApplicationResult, ApplicationStageHistory, PipelineStage } from '../../types/domain'

export function copyPipeline(stages: PipelineStage[]): PipelineStage[] {
  return [...stages]
    .sort((a, b) => a.order - b.order)
    .map((stage, order) => ({ ...stage, id: uid(), order }))
}

export function normalizePipeline(stages: PipelineStage[]): PipelineStage[] {
  return stages.map((stage, order) => ({ ...stage, order }))
}

export function createStageHistory(
  application: Application,
  nextStage: PipelineStage,
  occurredAt = nowIso(),
): ApplicationStageHistory {
  const previous = application.pipeline.find((stage) => stage.id === application.currentStageId)
  return {
    id: uid(),
    applicationId: application.id,
    fromStageId: previous?.id,
    fromStageNameSnapshot: previous?.name,
    fromCategorySnapshot: previous?.category,
    toStageId: nextStage.id,
    toStageNameSnapshot: nextStage.name,
    toCategorySnapshot: nextStage.category,
    action: 'stage_changed',
    resultSnapshot: application.result,
    occurredAt,
    createdAt: occurredAt,
  }
}

export async function changeApplicationStage(applicationId: string, nextStageId: string, note?: string) {
  await db.transaction('rw', db.applications, db.applicationStageHistory, db.recruitmentCycles, async () => {
    const application = await db.applications.get(applicationId)
    if (!application) throw new Error('投递记录不存在。')
    await assertCycleWritable(application.cycleId)
    if (application.result !== 'active') throw new Error('已结束的投递需要先恢复为进行中。')
    const nextStage = application.pipeline.find((stage) => stage.id === nextStageId)
    if (!nextStage) throw new Error('目标流程阶段不存在。')
    if (nextStageId === application.currentStageId) return
    const timestamp = nowIso()
    const history = { ...createStageHistory(application, nextStage, timestamp), note }
    await db.applications.put({ ...application, currentStageId: nextStageId, updatedAt: timestamp })
    await db.applicationStageHistory.add(history)
  })
}

export async function changeApplicationResult(applicationId: string, result: ApplicationResult, note?: string) {
  await db.transaction('rw', db.applications, db.applicationStageHistory, db.recruitmentCycles, async () => {
    const application = await db.applications.get(applicationId)
    if (!application) throw new Error('投递记录不存在。')
    await assertCycleWritable(application.cycleId)
    if (application.result === result) return
    const timestamp = nowIso()
    const current = application.pipeline.find((stage) => stage.id === application.currentStageId)
    const history: ApplicationStageHistory = {
      id: uid(),
      applicationId,
      fromStageId: current?.id,
      fromStageNameSnapshot: current?.name,
      fromCategorySnapshot: current?.category,
      toStageId: current?.id,
      toStageNameSnapshot: current?.name,
      toCategorySnapshot: current?.category,
      action: 'result_changed',
      resultSnapshot: result,
      note,
      occurredAt: timestamp,
      createdAt: timestamp,
    }
    await db.applications.put({ ...application, result, updatedAt: timestamp })
    await db.applicationStageHistory.add(history)
  })
}

export async function updateApplicationPipeline(applicationId: string, stages: PipelineStage[]) {
  if (!stages.length) throw new Error('投递流程至少需要一个阶段。')
  await db.transaction('rw', db.applications, db.applicationStageHistory, db.recruitmentCycles, async () => {
    const application = await db.applications.get(applicationId)
    if (!application) throw new Error('投递记录不存在。')
    await assertCycleWritable(application.cycleId)
    const normalized = normalizePipeline(stages)
    const removed = application.pipeline.filter((stage) => !normalized.some((next) => next.id === stage.id))
    if (removed.some((stage) => stage.id === application.currentStageId)) throw new Error('不能删除当前所在阶段。')
    if (removed.length) {
      const histories = await db.applicationStageHistory.where('applicationId').equals(applicationId).toArray()
      const usedIds = new Set(histories.flatMap((history) => [history.fromStageId, history.toStageId].filter((value): value is string => !!value)))
      if (removed.some((stage) => usedIds.has(stage.id))) throw new Error('已进入历史记录的阶段不能删除。')
    }
    const inserted = normalized.filter((stage) => !application.pipeline.some((previous) => previous.id === stage.id))
    const timestamp = nowIso()
    await db.applications.put({ ...application, pipeline: normalized, currentStageId: application.currentStageId, updatedAt: timestamp })
    if (inserted.length) {
      await db.applicationStageHistory.bulkAdd(
        inserted.map((stage) => ({
          id: uid(),
          applicationId,
          toStageId: stage.id,
          toStageNameSnapshot: stage.name,
          toCategorySnapshot: stage.category,
          action: 'stage_inserted' as const,
          resultSnapshot: application.result,
          note: `新增流程阶段：${stage.name}`,
          occurredAt: timestamp,
          createdAt: timestamp,
        })),
      )
    }
  })
}
