import { db } from './schema'
import type {
  AppSetting,
  Application,
  ApplicationStageHistory,
  CareerAccountMeta,
  Company,
  Interview,
  LLMProviderConfig,
  Position,
  RecruitmentCycle,
  RecruitmentEvent,
} from '../types/domain'
import { normalizeName, nowIso, uid } from '../lib/utils'
import { createDefaultPipeline } from '../lib/constants'

export const settingsRepo = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const item = await db.settings.get(key)
    return (item?.value as T | undefined) ?? fallback
  },
  async set(key: string, value: unknown) {
    const item: AppSetting = { key, value, updatedAt: nowIso() }
    await db.settings.put(item)
  },
}

export async function createCycle(input: Pick<RecruitmentCycle, 'name' | 'type' | 'startDate' | 'endDate' | 'notes'>) {
  const timestamp = nowIso()
  const cycle: RecruitmentCycle = {
    id: uid(),
    name: normalizeName(input.name),
    type: input.type,
    status: 'active',
    startDate: input.startDate || undefined,
    endDate: input.endDate || undefined,
    notes: input.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.transaction('rw', db.recruitmentCycles, db.settings, async () => {
    await db.recruitmentCycles.add(cycle)
    await db.settings.put({ key: 'currentCycleId', value: cycle.id, updatedAt: timestamp })
  })
  return cycle
}

export async function archiveCycle(id: string) {
  const cycle = await db.recruitmentCycles.get(id)
  if (!cycle) return
  const timestamp = nowIso()
  await db.recruitmentCycles.put({ ...cycle, status: 'archived', archivedAt: timestamp, updatedAt: timestamp })
}

export async function restoreCycle(id: string) {
  const cycle = await db.recruitmentCycles.get(id)
  if (!cycle) return
  await db.recruitmentCycles.put({ ...cycle, status: 'active', archivedAt: undefined, updatedAt: nowIso() })
}

export async function createCompany(input: Pick<Company, 'name' | 'websiteUrl' | 'careerUrl' | 'notes'>) {
  const timestamp = nowIso()
  const company: Company = { id: uid(), name: normalizeName(input.name), websiteUrl: input.websiteUrl, careerUrl: input.careerUrl, notes: input.notes, createdAt: timestamp, updatedAt: timestamp }
  await db.companies.add(company)
  return company
}

export async function createPosition(input: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>) {
  const timestamp = nowIso()
  const position: Position = { ...input, title: normalizeName(input.title), id: uid(), createdAt: timestamp, updatedAt: timestamp }
  await db.positions.add(position)
  return position
}

export async function createApplication(input: {
  cycleId: string
  positionId: string
  appliedAt?: string
  applyChannel?: Application['applyChannel']
  applyChannelText?: string
  pipeline?: Application['pipeline']
  resumeVersion?: string
  notes?: string
}) {
  const timestamp = nowIso()
  const pipeline = (input.pipeline?.length ? input.pipeline : createDefaultPipeline()).map((stage, order) => ({ ...stage, id: uid(), order }))
  const initialStage = pipeline[0]
  if (!initialStage) throw new Error('投递流程至少需要一个阶段。')
  const application: Application = {
    id: uid(),
    cycleId: input.cycleId,
    positionId: input.positionId,
    appliedAt: input.appliedAt,
    applyChannel: input.applyChannel,
    applyChannelText: input.applyChannelText,
    pipeline,
    currentStageId: initialStage.id,
    result: 'active',
    resumeVersion: input.resumeVersion,
    notes: input.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const history: ApplicationStageHistory = {
    id: uid(),
    applicationId: application.id,
    toStageId: initialStage.id,
    toStageNameSnapshot: initialStage.name,
    toCategorySnapshot: initialStage.category,
    action: 'created',
    resultSnapshot: 'active',
    occurredAt: timestamp,
    createdAt: timestamp,
  }
  await db.transaction('rw', db.applications, db.applicationStageHistory, async () => {
    await db.applications.add(application)
    await db.applicationStageHistory.add(history)
  })
  return application
}

export async function deleteApplicationCascade(id: string) {
  await db.transaction('rw', db.applications, db.applicationStageHistory, db.events, db.interviews, async () => {
    await db.applicationStageHistory.where('applicationId').equals(id).delete()
    await db.events.where('applicationId').equals(id).delete()
    await db.interviews.where('applicationId').equals(id).delete()
    await db.applications.delete(id)
  })
}

export async function deletePositionSafe(id: string, cascade = false) {
  const applications = await db.applications.where('positionId').equals(id).toArray()
  if (applications.length && !cascade) throw new Error(`该岗位关联 ${applications.length} 条投递，不能直接删除。`)
  await db.transaction('rw', db.positions, db.applications, db.applicationStageHistory, db.events, db.interviews, async () => {
    for (const application of applications) await deleteApplicationCascade(application.id)
    await db.events.where('positionId').equals(id).delete()
    await db.positions.delete(id)
  })
}

export async function deleteCompanySafe(id: string) {
  const count = await db.positions.where('companyId').equals(id).count()
  if (count) throw new Error(`该公司仍关联 ${count} 个岗位，无法删除。`)
  await db.transaction('rw', db.companies, db.careerAccounts, db.careerAccountSecrets, async () => {
    const accounts = await db.careerAccounts.where('companyId').equals(id).toArray()
    await db.careerAccountSecrets.bulkDelete(accounts.map((account) => account.id))
    await db.careerAccounts.where('companyId').equals(id).delete()
    await db.companies.delete(id)
  })
}

export async function getCycleData(cycleId: string) {
  const [positions, applications, events, interviews] = await Promise.all([
    db.positions.where('cycleId').equals(cycleId).toArray(),
    db.applications.where('cycleId').equals(cycleId).toArray(),
    db.events.where('cycleId').equals(cycleId).toArray(),
    db.interviews.where('cycleId').equals(cycleId).toArray(),
  ])
  return { positions, applications, events, interviews }
}
