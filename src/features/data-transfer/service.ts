import { format } from 'date-fns'
import { db } from '../../db/schema'
import { APP_VERSION, EXPORT_SCHEMA_VERSION } from '../../lib/constants'
import { downloadBlob, nowIso } from '../../lib/utils'
import type { ExportBundle } from '../../types/domain'
import { exportBundleSchema } from './schema'

export async function createExportBundle(): Promise<ExportBundle> {
  const [recruitmentCycles, companies, careerAccounts, positions, applications, applicationStageHistory, events, interviews, settings, providers] = await Promise.all([
    db.recruitmentCycles.toArray(), db.companies.toArray(), db.careerAccounts.toArray(), db.positions.toArray(), db.applications.toArray(), db.applicationStageHistory.toArray(), db.events.toArray(), db.interviews.toArray(), db.settings.toArray(), db.llmProviderConfigs.toArray(),
  ])
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: nowIso(),
    data: {
      recruitmentCycles,
      companies,
      careerAccounts,
      positions,
      applications,
      applicationStageHistory,
      events,
      interviews,
      settings,
      llmProviderConfigs: providers.map(({ apiKeyRef: _apiKeyRef, ...provider }) => provider),
    },
  }
}

export async function exportJSON() {
  const bundle = await createExportBundle()
  downloadBlob(JSON.stringify(bundle, null, 2), `job-hunt-data-${format(new Date(), 'yyyy-MM-dd')}.json`, 'application/json;charset=utf-8')
}

export function parseImportBundle(text: string): ExportBundle {
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new Error('文件不是有效的 JSON。') }
  const result = exportBundleSchema.safeParse(parsed)
  if (!result.success) throw new Error(`导入校验失败：${result.error.issues[0]?.message ?? '格式错误'}`)
  return result.data as ExportBundle
}

export function importSummary(bundle: ExportBundle) {
  return {
    招聘季: bundle.data.recruitmentCycles.length,
    公司: bundle.data.companies.length,
    岗位: bundle.data.positions.length,
    投递: bundle.data.applications.length,
    流程历史: bundle.data.applicationStageHistory.length,
    日程: bundle.data.events.length,
    面试: bundle.data.interviews.length,
  }
}

async function validateReferences(bundle: ExportBundle) {
  const cycleIds = new Set(bundle.data.recruitmentCycles.map((item) => item.id))
  const companyIds = new Set(bundle.data.companies.map((item) => item.id))
  const positionIds = new Set(bundle.data.positions.map((item) => item.id))
  const applicationIds = new Set(bundle.data.applications.map((item) => item.id))
  for (const position of bundle.data.positions) {
    if (!cycleIds.has(position.cycleId) || !companyIds.has(position.companyId)) throw new Error(`岗位“${position.title}”的招聘季或公司引用无效。`)
  }
  for (const application of bundle.data.applications) {
    if (!cycleIds.has(application.cycleId) || !positionIds.has(application.positionId)) throw new Error('投递记录存在无效引用。')
    if (!application.pipeline.some((stage) => stage.id === application.currentStageId)) throw new Error('投递记录的当前阶段不在 Pipeline 中。')
  }
  if (bundle.data.applicationStageHistory.some((item) => !applicationIds.has(item.applicationId))) throw new Error('流程历史存在无效投递引用。')
}

export async function importBundle(bundle: ExportBundle, mode: 'merge' | 'replace') {
  await validateReferences(bundle)
  await db.transaction('rw', [db.recruitmentCycles, db.companies, db.careerAccounts, db.positions, db.applications, db.applicationStageHistory, db.events, db.interviews, db.settings, db.llmProviderConfigs], async () => {
    if (mode === 'replace') {
      await Promise.all([db.recruitmentCycles.clear(), db.companies.clear(), db.careerAccounts.clear(), db.positions.clear(), db.applications.clear(), db.applicationStageHistory.clear(), db.events.clear(), db.interviews.clear(), db.settings.clear(), db.llmProviderConfigs.clear()])
    }
    const data = bundle.data
    await db.recruitmentCycles.bulkPut(data.recruitmentCycles)
    await db.companies.bulkPut(data.companies)
    await db.careerAccounts.bulkPut(data.careerAccounts)
    await db.positions.bulkPut(data.positions)
    await db.applications.bulkPut(data.applications)
    await db.applicationStageHistory.bulkPut(data.applicationStageHistory)
    await db.events.bulkPut(data.events)
    await db.interviews.bulkPut(data.interviews)
    await db.settings.bulkPut(data.settings)
    await db.llmProviderConfigs.bulkPut(data.llmProviderConfigs.map((provider) => ({ ...provider, apiKeyRef: undefined })))
  })
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export async function exportApplicationsCSV(cycleId?: string) {
  const [cycles, companies, positions, applications] = await Promise.all([db.recruitmentCycles.toArray(), db.companies.toArray(), db.positions.toArray(), db.applications.toArray()])
  const rows = applications.filter((item) => !cycleId || item.cycleId === cycleId).map((application) => {
    const cycle = cycles.find((item) => item.id === application.cycleId)
    const position = positions.find((item) => item.id === application.positionId)
    const company = companies.find((item) => item.id === position?.companyId)
    const stage = application.pipeline.find((item) => item.id === application.currentStageId)
    return [cycle?.name, company?.name, position?.title, position?.locations.join(' / '), stage?.name, stage?.category, application.result, application.appliedAt, application.applyChannel === 'other' ? application.applyChannelText : application.applyChannel, position?.jobUrl, position?.officialUrl, position?.consultUrl]
  })
  const headers = ['招聘季', '公司', '岗位', '地点', '当前 Stage', 'Category', 'Result', '投递时间', '投递渠道', '岗位链接', '官网链接', '咨询链接']
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}`
  downloadBlob(csv, `job-hunt-applications-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv;charset=utf-8')
}

export async function clearOrdinaryData() {
  await db.transaction('rw', [db.recruitmentCycles, db.companies, db.careerAccounts, db.positions, db.applications, db.applicationStageHistory, db.events, db.interviews, db.settings, db.llmProviderConfigs], async () => {
    await Promise.all([db.recruitmentCycles.clear(), db.companies.clear(), db.careerAccounts.clear(), db.positions.clear(), db.applications.clear(), db.applicationStageHistory.clear(), db.events.clear(), db.interviews.clear(), db.settings.clear(), db.llmProviderConfigs.clear()])
  })
}
