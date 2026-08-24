import { db } from '../db/schema'

export async function resetDatabase() {
  await db.delete()
  await db.open()
}
