import { db } from '../../db/schema'
import { nowIso, uid } from '../../lib/utils'
import { saveCareerAccountSecret } from '../../security/secrets'
import type { CareerAccountMeta, CareerAccountSecretPayload, LoginMethod } from '../../types/domain'

export async function saveCareerAccount(input: {
  companyId: string
  label?: string
  loginUrl?: string
  loginMethods: LoginMethod[]
  notes?: string
  secret: CareerAccountSecretPayload
}, edit?: CareerAccountMeta) {
  const timestamp = nowIso()
  const id = edit?.id ?? uid()
  const meta: CareerAccountMeta = {
    id,
    companyId: input.companyId,
    label: input.label || undefined,
    loginUrl: input.loginUrl || undefined,
    loginMethods: input.loginMethods,
    wechatEnabled: input.loginMethods.includes('wechat'),
    notes: input.notes || undefined,
    createdAt: edit?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  await db.careerAccounts.put(meta)
  try {
    await saveCareerAccountSecret(id, input.secret)
  } catch (error) {
    if (!edit) await db.careerAccounts.delete(id)
    throw error
  }
  return meta
}

export async function deleteCareerAccount(id: string) {
  await db.transaction('rw', db.careerAccounts, db.careerAccountSecrets, async () => {
    await db.careerAccounts.delete(id)
    await db.careerAccountSecrets.delete(id)
  })
}
