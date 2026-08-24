import { z } from 'zod'
import { structuredJDSchema } from '../ai/schema'

const timestamp = z.string()
const pipelineCategory = z.enum(['todo', 'applied', 'pre_interview', 'interview', 'offer'])
const pipelineStage = z.object({ id: z.string(), name: z.string(), category: pipelineCategory, order: z.number() })

const cycleSchema = z.object({
  id: z.string(), name: z.string(), type: z.enum(['autumn', 'spring', 'summer_intern', 'daily_intern', 'other']).optional(),
  status: z.enum(['active', 'archived']), startDate: z.string().optional(), endDate: z.string().optional(), notes: z.string().optional(),
  createdAt: timestamp, updatedAt: timestamp, archivedAt: timestamp.optional(),
})
const companySchema = z.object({ id: z.string(), name: z.string(), websiteUrl: z.string().optional(), careerUrl: z.string().optional(), notes: z.string().optional(), createdAt: timestamp, updatedAt: timestamp })
const accountSchema = z.object({ id: z.string(), companyId: z.string(), label: z.string().optional(), loginUrl: z.string().optional(), loginMethods: z.array(z.enum(['phone', 'email', 'wechat', 'username', 'other'])), wechatEnabled: z.boolean(), notes: z.string().optional(), createdAt: timestamp, updatedAt: timestamp })
const positionSchema = z.object({ id: z.string(), cycleId: z.string(), companyId: z.string(), title: z.string(), department: z.string().optional(), locations: z.array(z.string()), category: z.string().optional(), jobUrl: z.string().optional(), officialUrl: z.string().optional(), consultUrl: z.string().optional(), jdRaw: z.string().optional(), jdStructured: structuredJDSchema.optional(), jdParsedAt: timestamp.optional(), jdParserProvider: z.string().optional(), jdParserModel: z.string().optional(), notes: z.string().optional(), createdAt: timestamp, updatedAt: timestamp })
const applicationSchema = z.object({ id: z.string(), cycleId: z.string(), positionId: z.string(), appliedAt: z.string().optional(), applyChannel: z.enum(['official', 'boss', 'referral', 'campus', 'other']).optional(), applyChannelText: z.string().optional(), pipeline: z.array(pipelineStage).min(1), currentStageId: z.string(), result: z.enum(['active', 'rejected', 'withdrawn', 'closed', 'offer_accepted']), resumeVersion: z.string().optional(), notes: z.string().optional(), createdAt: timestamp, updatedAt: timestamp })
const historySchema = z.object({ id: z.string(), applicationId: z.string(), fromStageId: z.string().optional(), fromStageNameSnapshot: z.string().optional(), fromCategorySnapshot: pipelineCategory.optional(), toStageId: z.string().optional(), toStageNameSnapshot: z.string().optional(), toCategorySnapshot: pipelineCategory.optional(), action: z.enum(['created', 'stage_changed', 'result_changed', 'stage_inserted', 'note']), resultSnapshot: z.enum(['active', 'rejected', 'withdrawn', 'closed', 'offer_accepted']).optional(), note: z.string().optional(), occurredAt: timestamp, createdAt: timestamp })
const eventSchema = z.object({ id: z.string(), cycleId: z.string(), applicationId: z.string().optional(), positionId: z.string().optional(), type: z.enum(['assessment', 'written_test', 'interview', 'hr_interview', 'offer', 'deadline', 'follow_up', 'custom']), title: z.string(), startAt: timestamp.optional(), endAt: timestamp.optional(), allDay: z.boolean(), mode: z.enum(['online', 'offline', 'phone', 'unknown']).optional(), meetingUrl: z.string().optional(), location: z.string().optional(), completed: z.boolean(), notes: z.string().optional(), createdAt: timestamp, updatedAt: timestamp })
const interviewSchema = z.object({ id: z.string(), cycleId: z.string(), applicationId: z.string(), eventId: z.string().optional(), stageId: z.string().optional(), stageNameSnapshot: z.string(), interviewer: z.string().optional(), durationMinutes: z.number().optional(), result: z.enum(['pending', 'passed', 'failed', 'unknown']).optional(), notes: z.string().optional(), reflection: z.string().optional(), createdAt: timestamp, updatedAt: timestamp })
const settingSchema = z.object({ key: z.string(), value: z.unknown(), updatedAt: timestamp })
const providerSchema = z.object({ id: z.string(), name: z.string(), providerType: z.literal('openai_compatible'), baseUrl: z.string(), model: z.string(), isDefault: z.boolean(), createdAt: timestamp, updatedAt: timestamp })

export const exportBundleSchema = z.object({
  schemaVersion: z.literal(1),
  appVersion: z.string(),
  exportedAt: timestamp,
  data: z.object({
    recruitmentCycles: z.array(cycleSchema),
    companies: z.array(companySchema),
    careerAccounts: z.array(accountSchema).default([]),
    positions: z.array(positionSchema),
    applications: z.array(applicationSchema),
    applicationStageHistory: z.array(historySchema),
    events: z.array(eventSchema),
    interviews: z.array(interviewSchema),
    settings: z.array(settingSchema),
    llmProviderConfigs: z.array(providerSchema),
  }),
})
