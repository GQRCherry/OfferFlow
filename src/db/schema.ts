import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSetting,
  Application,
  ApplicationStageHistory,
  CareerAccountMeta,
  Company,
  EncryptedSecret,
  Interview,
  LLMProviderConfig,
  Position,
  RecruitmentCycle,
  RecruitmentEvent,
} from '../types/domain'

export class OfferFlowDB extends Dexie {
  recruitmentCycles!: EntityTable<RecruitmentCycle, 'id'>
  companies!: EntityTable<Company, 'id'>
  careerAccounts!: EntityTable<CareerAccountMeta, 'id'>
  positions!: EntityTable<Position, 'id'>
  applications!: EntityTable<Application, 'id'>
  applicationStageHistory!: EntityTable<ApplicationStageHistory, 'id'>
  events!: EntityTable<RecruitmentEvent, 'id'>
  interviews!: EntityTable<Interview, 'id'>
  settings!: EntityTable<AppSetting, 'key'>
  llmProviderConfigs!: EntityTable<LLMProviderConfig, 'id'>
  careerAccountSecrets!: EntityTable<EncryptedSecret, 'id'>
  llmSecrets!: EntityTable<EncryptedSecret, 'id'>

  constructor() {
    super('offerflow')
    this.version(1).stores({
      recruitmentCycles: 'id, status, name, startDate, updatedAt',
      companies: 'id, name, updatedAt',
      careerAccounts: 'id, companyId, updatedAt',
      positions: 'id, cycleId, companyId, title, *locations, updatedAt, [cycleId+companyId]',
      applications: 'id, cycleId, positionId, result, appliedAt, updatedAt, [cycleId+result]',
      applicationStageHistory: 'id, applicationId, occurredAt, [applicationId+occurredAt]',
      events: 'id, cycleId, applicationId, positionId, type, startAt, completed, [cycleId+startAt]',
      interviews: 'id, cycleId, applicationId, eventId, stageNameSnapshot, updatedAt',
      settings: 'key, updatedAt',
      llmProviderConfigs: 'id, isDefault, name, updatedAt',
      careerAccountSecrets: 'id, ownerId, updatedAt',
      llmSecrets: 'id, ownerId, updatedAt',
    })
    this.version(2).stores({
      recruitmentCycles: 'id, status, name, startDate, createdAt, updatedAt',
    })
  }
}

export const db = new OfferFlowDB()

export async function assertIndexedDBAvailable() {
  if (!('indexedDB' in globalThis)) throw new Error('当前浏览器不支持 IndexedDB，无法安全保存数据。')
  await db.open()
}
