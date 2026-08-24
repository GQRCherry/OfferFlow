import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProvider } from '../app/AppContext'
import { App } from '../app/App'
import { createApplication, createCompany, createCycle, createPosition } from '../db/repositories'
import { resetDatabase } from './db'
import { readCareerAccountSecret } from '../security/secrets'
import { db } from '../db/schema'
import { saveCareerAccount } from '../features/companies/service'
import { saveEvent } from '../features/events/service'

beforeEach(resetDatabase)
afterEach(cleanup)

describe('PRD 验收流程', () => {
  it('AC-01 首次使用可创建招聘季并进入总览', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/dashboard']}><AppProvider><App /></AppProvider></MemoryRouter>)

    expect(await screen.findByText('把招聘季，变成一条清晰的路径。')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '创建第一个招聘季' }))
    await user.type(screen.getByLabelText('招聘季名称'), '2027 春招')
    await user.click(screen.getByRole('button', { name: '创建招聘季' }))

    expect(await screen.findByText('掌握这一周，推进每一步。')).toBeInTheDocument()
    expect(await db.recruitmentCycles.count()).toBe(1)
  })

  it('AC-02 不同招聘季中的同名岗位保持隔离', async () => {
    const company = await createCompany({ name: '星河科技', websiteUrl: '', careerUrl: '', notes: '' })
    const autumn = await createCycle({ name: '2027 秋招', type: 'autumn', startDate: '', endDate: '', notes: '' })
    const spring = await createCycle({ name: '2028 春招', type: 'spring', startDate: '', endDate: '', notes: '' })
    const first = await createPosition({ cycleId: autumn.id, companyId: company.id, title: '后端开发', locations: ['上海'], jdRaw: '秋招 JD' })
    const second = await createPosition({ cycleId: spring.id, companyId: company.id, title: '后端开发', locations: ['上海'], jdRaw: '春招 JD' })

    expect(first.id).not.toBe(second.id)
    expect(first.cycleId).not.toBe(second.cycleId)
    expect(first.jdRaw).not.toBe(second.jdRaw)
  })


  it('AC-09 笔试日程会出现在本周总览', async () => {
    const cycle = await createCycle({ name: '2027 春招', type: 'spring', startDate: '', endDate: '', notes: '' })
    const company = await createCompany({ name: '星河科技', websiteUrl: '', careerUrl: '', notes: '' })
    const position = await createPosition({ cycleId: cycle.id, companyId: company.id, title: '后端开发', locations: ['上海'] })
    const application = await createApplication({ cycleId: cycle.id, positionId: position.id })
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    tomorrow.setHours(19, 0, 0, 0)
    await saveEvent({ cycleId: cycle.id, applicationId: application.id, positionId: position.id, type: 'written_test', title: '后端开发笔试', startAt: tomorrow.toISOString(), allDay: false, mode: 'online', completed: false })

    render(<MemoryRouter initialEntries={['/dashboard']}><AppProvider><App /></AppProvider></MemoryRouter>)
    expect((await screen.findAllByText('后端开发笔试')).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('1 项')).toBeInTheDocument()
  })

  it('AC-11 招聘官网密码独立加密保存并可读取', async () => {
    const company = await createCompany({ name: '星河科技', websiteUrl: '', careerUrl: '', notes: '' })
    const account = await saveCareerAccount({ companyId: company.id, label: '校招官网', loginMethods: ['username', 'wechat'], secret: { username: 'candidate', password: 'local-password' } })

    expect(await readCareerAccountSecret(account.id)).toEqual({ username: 'candidate', password: 'local-password' })
    expect(await db.careerAccounts.get(account.id)).toMatchObject({ loginMethods: ['username', 'wechat'], wechatEnabled: true })
    expect(await db.careerAccounts.get(account.id)).not.toHaveProperty('password')
    expect((await db.careerAccountSecrets.get(account.id))?.ciphertext).not.toContain('local-password')
  })
})
