import type { ApplicationResult, ApplyChannel, Interview, PipelineCategory, PipelineStage, StructuredJD } from '../types/domain'

export const APP_VERSION = '1.0.0'
export const EXPORT_SCHEMA_VERSION = 1

export const PIPELINE_CATEGORY_ORDER: PipelineCategory[] = [
  'todo',
  'applied',
  'pre_interview',
  'interview',
  'offer',
]

export const PIPELINE_CATEGORY_LABELS: Record<PipelineCategory, string> = {
  todo: '待投递',
  applied: '已投递',
  pre_interview: '前置流程',
  interview: '面试',
  offer: 'Offer',
}


export const APPLICATION_RESULT_LABELS: Record<ApplicationResult, string> = {
  active: '进行中',
  rejected: '已拒绝',
  withdrawn: '已撤回',
  closed: '已关闭',
  offer_accepted: '已接受 Offer',
}

export const APPLY_CHANNEL_LABELS: Record<ApplyChannel, string> = {
  official: '公司官网',
  boss: 'Boss 直聘',
  referral: '内推',
  campus: '校园招聘平台',
  other: '其他',
}

export const INTERVIEW_RESULT_LABELS: Record<NonNullable<Interview['result']>, string> = {
  pending: '待定',
  passed: '通过',
  failed: '未通过',
  unknown: '未知',
}

export function createDefaultPipeline(): PipelineStage[] {
  const items: Array<[string, PipelineCategory]> = [
    ['待投递', 'todo'],
    ['已投递', 'applied'],
    ['简历筛选', 'pre_interview'],
    ['测评', 'pre_interview'],
    ['笔试', 'pre_interview'],
    ['一面', 'interview'],
    ['二面', 'interview'],
    ['HR 面', 'interview'],
    ['OC', 'offer'],
    ['Offer', 'offer'],
  ]
  return items.map(([name, category], order) => ({ id: crypto.randomUUID(), name, category, order }))
}

export function emptyStructuredJD(): StructuredJD {
  return {
    locations: [],
    responsibilities: [],
    requirements: [],
    preferred: [],
    keywords: [],
    other: [],
  }
}

export const SILICONFLOW_PRESET = {
  name: 'SiliconFlow',
  baseUrl: 'https://api.siliconflow.cn/v1',
  model: 'Qwen/Qwen3-8B',
} as const
