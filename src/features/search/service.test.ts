import { describe, expect, it } from 'vitest'
import type { Application, Company, Interview, Position } from '../../types/domain'
import { searchCycleData } from './service'

const timestamp = '2026-08-24T00:00:00.000Z'
const company: Company = { id: 'c1', name: '星河科技', notes: '数据库团队', createdAt: timestamp, updatedAt: timestamp }
const position: Position = { id: 'p1', cycleId: 'cycle-1', companyId: 'c1', title: '后端开发', locations: ['上海'], jdRaw: '绝密原文 only-raw-token', jdStructured: { locations: ['上海'], responsibilities: ['构建 Redis 服务'], requirements: [], preferred: [], keywords: ['Redis'], other: [] }, createdAt: timestamp, updatedAt: timestamp }
const application: Application = { id: 'a1', cycleId: 'cycle-1', positionId: 'p1', pipeline: [{ id: 's1', name: '一面', category: 'interview', order: 0 }], currentStageId: 's1', result: 'active', notes: '准备系统设计', createdAt: timestamp, updatedAt: timestamp }
const interview: Interview = { id: 'i1', cycleId: 'cycle-1', applicationId: 'a1', stageNameSnapshot: '一面', notes: '问了 Redis 持久化', reflection: '需要加强', createdAt: timestamp, updatedAt: timestamp }

describe('global search privacy boundaries', () => {
  it('finds structured JD and interview notes', () => {
    const results = searchCycleData({ query: 'Redis', cycleId: 'cycle-1', companies: [company], positions: [position], applications: [application], interviews: [interview], events: [] })
    expect(results.map((item) => item.group)).toEqual(expect.arrayContaining(['岗位', '面经']))
  })

  it('does not index raw JD', () => {
    const results = searchCycleData({ query: 'only-raw-token', cycleId: 'cycle-1', companies: [company], positions: [position], applications: [application], interviews: [interview], events: [] })
    expect(results).toHaveLength(0)
  })
})
