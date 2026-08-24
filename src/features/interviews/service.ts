import { assertCycleWritable } from '../../db/repositories'
import { db } from '../../db/schema'
import { nowIso, uid } from '../../lib/utils'
import type { Interview } from '../../types/domain'

export type InterviewInput = Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>

export async function saveInterview(input: InterviewInput, edit?: Interview) {
  await assertCycleWritable(input.cycleId)
  const timestamp = nowIso()
  const interview: Interview = { ...input, id: edit?.id ?? uid(), createdAt: edit?.createdAt ?? timestamp, updatedAt: timestamp }
  await db.interviews.put(interview)
  return interview
}

export async function deleteInterview(interview: Interview) {
  await assertCycleWritable(interview.cycleId)
  await db.interviews.delete(interview.id)
}
