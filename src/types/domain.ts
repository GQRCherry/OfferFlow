export type ISODate = string
export type ISODateTime = string

export interface RecruitmentCycle {
  id: string
  name: string
  type?: 'autumn' | 'spring' | 'summer_intern' | 'daily_intern' | 'other'
  status: 'active' | 'archived'
  startDate?: ISODate
  endDate?: ISODate
  notes?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
  archivedAt?: ISODateTime
}

export interface Company {
  id: string
  name: string
  websiteUrl?: string
  careerUrl?: string
  notes?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type LoginMethod = 'phone' | 'email' | 'wechat' | 'username' | 'other'

export interface CareerAccountMeta {
  id: string
  companyId: string
  label?: string
  loginUrl?: string
  loginMethods: LoginMethod[]
  wechatEnabled: boolean
  notes?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface CareerAccountSecretPayload {
  phone?: string
  email?: string
  username?: string
  password?: string
}

export interface EncryptedSecret {
  id: string
  ownerId: string
  iv: string
  ciphertext: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface StructuredJD {
  title?: string
  department?: string
  locations: string[]
  responsibilities: string[]
  requirements: string[]
  preferred: string[]
  keywords: string[]
  education?: string
  graduationRequirement?: string
  other?: string[]
}

export interface Position {
  id: string
  cycleId: string
  companyId: string
  title: string
  department?: string
  locations: string[]
  category?: string
  jobUrl?: string
  officialUrl?: string
  consultUrl?: string
  jdRaw?: string
  jdStructured?: StructuredJD
  jdParsedAt?: ISODateTime
  jdParserProvider?: string
  jdParserModel?: string
  notes?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type PipelineCategory = 'todo' | 'applied' | 'pre_interview' | 'interview' | 'offer'

export interface PipelineStage {
  id: string
  name: string
  category: PipelineCategory
  order: number
}

export type ApplicationResult = 'active' | 'rejected' | 'withdrawn' | 'closed' | 'offer_accepted'
export type ApplyChannel = 'official' | 'boss' | 'referral' | 'campus' | 'other'

export interface Application {
  id: string
  cycleId: string
  positionId: string
  appliedAt?: ISODate
  applyChannel?: ApplyChannel
  applyChannelText?: string
  pipeline: PipelineStage[]
  currentStageId: string
  result: ApplicationResult
  resumeVersion?: string
  notes?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type HistoryAction = 'created' | 'stage_changed' | 'result_changed' | 'stage_inserted' | 'note'

export interface ApplicationStageHistory {
  id: string
  applicationId: string
  fromStageId?: string
  fromStageNameSnapshot?: string
  fromCategorySnapshot?: PipelineCategory
  toStageId?: string
  toStageNameSnapshot?: string
  toCategorySnapshot?: PipelineCategory
  action: HistoryAction
  resultSnapshot?: ApplicationResult
  note?: string
  occurredAt: ISODateTime
  createdAt: ISODateTime
}

export type RecruitmentEventType =
  | 'assessment'
  | 'written_test'
  | 'interview'
  | 'hr_interview'
  | 'offer'
  | 'deadline'
  | 'follow_up'
  | 'custom'

export interface RecruitmentEvent {
  id: string
  cycleId: string
  applicationId?: string
  positionId?: string
  type: RecruitmentEventType
  title: string
  startAt?: ISODateTime
  endAt?: ISODateTime
  allDay: boolean
  mode?: 'online' | 'offline' | 'phone' | 'unknown'
  meetingUrl?: string
  location?: string
  completed: boolean
  notes?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Interview {
  id: string
  cycleId: string
  applicationId: string
  eventId?: string
  stageId?: string
  stageNameSnapshot: string
  interviewer?: string
  durationMinutes?: number
  result?: 'pending' | 'passed' | 'failed' | 'unknown'
  notes?: string
  reflection?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface LLMProviderConfig {
  id: string
  name: string
  providerType: 'openai_compatible'
  baseUrl: string
  model: string
  apiKeyRef?: string
  isDefault: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type Theme = 'system' | 'light' | 'dark'

export interface AppSetting {
  key: string
  value: unknown
  updatedAt: ISODateTime
}

export interface ExportBundle {
  schemaVersion: number
  appVersion: string
  exportedAt: ISODateTime
  data: {
    recruitmentCycles: RecruitmentCycle[]
    companies: Company[]
    careerAccounts: CareerAccountMeta[]
    positions: Position[]
    applications: Application[]
    applicationStageHistory: ApplicationStageHistory[]
    events: RecruitmentEvent[]
    interviews: Interview[]
    settings: AppSetting[]
    llmProviderConfigs: Array<Omit<LLMProviderConfig, 'apiKeyRef'>>
  }
}
