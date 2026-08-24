import { describe, expect, it } from 'vitest'
import type { Application, PipelineStage, Position } from '../../types/domain'
import { calculateDashboardStats } from './service'

const timestamp = '2026-08-24T00:00:00.000Z'
const positions = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }].map((item) => ({ ...item, cycleId: 'cycle', companyId: 'company', title: item.id, locations: [], createdAt: timestamp, updatedAt: timestamp })) as Position[]

function application(id: string, stage: PipelineStage, pipeline = [stage]): Application {
  return { id, cycleId: 'cycle', positionId: `p${id}`, pipeline, currentStageId: stage.id, result: 'active', createdAt: timestamp, updatedAt: timestamp }
}

describe('总览统计口径', () => {
  it('不同具体阶段名称只按固定大类统计', () => {
    const first = application('1', { id: 's1', name: '技术终面', category: 'interview', order: 0 })
    const second = application('2', { id: 's2', name: '业务主管交流', category: 'interview', order: 0 })
    const third = application('3', { id: 's3', name: '在线测评', category: 'pre_interview', order: 0 })

    expect(calculateDashboardStats(positions, [first, second, third])).toMatchObject({ positions: 3, applied: 3, pre: 1, interview: 2, offer: 0 })
  })

  it('HR 面位于流程前后均归入面试统计', () => {
    const earlyHr = { id: 'hr-early', name: 'HR 面', category: 'interview' as const, order: 0 }
    const lateHr = { id: 'hr-late', name: 'HRBP 面', category: 'interview' as const, order: 2 }
    const first = application('1', earlyHr, [earlyHr, { id: 'tech', name: '技术面', category: 'interview', order: 1 }])
    const second = application('2', lateHr, [{ id: 'tech2', name: '技术面', category: 'interview', order: 0 }, lateHr])

    expect(calculateDashboardStats(positions, [first, second]).interview).toBe(2)
  })
})
