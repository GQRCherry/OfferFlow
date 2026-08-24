import { assertCycleWritable } from '../../db/repositories'
import { db } from '../../db/schema'
import { nowIso, uid } from '../../lib/utils'
import type { RecruitmentEvent } from '../../types/domain'

export type EventInput = Omit<RecruitmentEvent, 'id' | 'createdAt' | 'updatedAt'>

export async function saveEvent(input: EventInput, edit?: RecruitmentEvent) {
  await assertCycleWritable(input.cycleId)
  const timestamp = nowIso()
  const event: RecruitmentEvent = { ...input, id: edit?.id ?? uid(), createdAt: edit?.createdAt ?? timestamp, updatedAt: timestamp }
  await db.events.put(event)
  return event
}

export async function deleteEvent(event: RecruitmentEvent) {
  await assertCycleWritable(event.cycleId)
  await db.events.delete(event.id)
}

export async function completeEvent(event: RecruitmentEvent) {
  await assertCycleWritable(event.cycleId)
  await db.events.update(event.id, { completed: true, updatedAt: nowIso() })
}
