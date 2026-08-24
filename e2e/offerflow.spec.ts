import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function createFirstCycle(page: Page, name = '2027 春招') {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '把招聘季，变成一条清晰的路径。' })).toBeVisible()
  await page.getByRole('button', { name: '创建第一个招聘季' }).click()
  await page.getByLabel('招聘季名称').fill(name)
  await page.getByRole('button', { name: '创建招聘季' }).click()
  await expect(page.getByRole('heading', { name: '掌握这一周，推进每一步。' })).toBeVisible()
}

async function createPosition(page: Page, options: { company?: string; existingCompany?: string; title?: string; jdRaw?: string } = {}) {
  const title = options.title ?? '后端开发工程师'
  await page.goto('/#/positions')
  const addButton = page.getByRole('button', { name: /新增(第一个)?岗位/ }).first()
  await addButton.click()
  if (options.existingCompany) await page.getByLabel('选择公司').selectOption({ label: options.existingCompany })
  else await page.getByLabel('或快速新增公司').fill(options.company ?? '星河科技')
  await page.getByLabel('岗位名称').fill(title)
  await page.getByLabel(/地点/).fill('上海、杭州')
  await page.getByPlaceholder('粘贴招聘网站中的原始 JD…').fill(options.jdRaw ?? '导航 推荐岗位。职责：构建高并发服务。要求：熟悉 Java 和 Redis。本科及以上。版权信息。')
  await page.getByRole('textbox', { name: /岗位职责/ }).fill('构建高并发服务')
  await page.getByRole('textbox', { name: /任职要求/ }).fill('熟悉 Java\n熟悉 Redis')
  await page.getByLabel('关键词').fill('Java、Redis')
  await page.getByRole('button', { name: '保存岗位' }).click()
  await expect(page.getByRole('row', { name: new RegExp(title) })).toBeVisible()
}

async function startApplication(page: Page, title = '后端开发工程师') {
  await page.goto('/#/positions')
  await page.getByRole('row', { name: new RegExp(title) }).click()
  await page.getByRole('button', { name: '开始投递' }).click()
  await page.getByLabel('投递日期').fill('2026-08-24')
  await page.getByLabel('投递渠道').selectOption('official')
  await page.getByRole('button', { name: '创建投递' }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page).toHaveURL(/#\/applications\//)
}

async function storeRows<T>(page: Page, storeName: string): Promise<T[]> {
  return page.evaluate((name) => new Promise<T[]>((resolve, reject) => {
    const request = indexedDB.open('offerflow')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction(name, 'readonly')
      const rows = transaction.objectStore(name).getAll()
      rows.onerror = () => reject(rows.error)
      rows.onsuccess = () => resolve(rows.result as T[])
    }
  }), storeName)
}

test('AC-01、AC-04：首次使用可创建招聘季，并从岗位建立默认投递流程与历史', async ({ page }) => {
  await createFirstCycle(page)
  await createPosition(page)
  await startApplication(page)

  await page.getByRole('button', { name: '流程' }).click()
  await expect(page.getByRole('button', { name: /1 待投递 待投递/ })).toBeVisible()
  await expect(page.getByText('创建于 待投递')).toBeVisible()

  const applications = await storeRows<{ pipeline: unknown[]; currentStageId: string }>(page, 'applications')
  const histories = await storeRows<{ action: string; toStageNameSnapshot: string }>(page, 'applicationStageHistory')
  expect(applications).toHaveLength(1)
  expect(applications[0].pipeline).toHaveLength(10)
  expect(histories).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'created', toStageNameSnapshot: '待投递' })]))
})

test('AC-02：不同招聘季中的同名岗位、JD 与投递保持隔离', async ({ page }) => {
  await createFirstCycle(page, '2027 秋招')
  await createPosition(page, { jdRaw: '秋招专属 JD' })
  await startApplication(page)

  await page.getByRole('button', { name: /当前招聘季/ }).click()
  await page.getByRole('button', { name: '新建招聘季' }).click()
  await page.getByLabel('招聘季名称').fill('2028 春招')
  await page.getByLabel('类型').selectOption('spring')
  await page.getByRole('button', { name: '创建招聘季' }).click()
  await page.getByRole('dialog', { name: '招聘季管理' }).getByLabel('关闭').click()
  await createPosition(page, { existingCompany: '星河科技', jdRaw: '春招专属 JD' })

  const positions = await storeRows<{ id: string; cycleId: string; jdRaw: string }>(page, 'positions')
  const applications = await storeRows<{ cycleId: string; positionId: string }>(page, 'applications')
  expect(positions).toHaveLength(2)
  expect(new Set(positions.map((item) => item.id)).size).toBe(2)
  expect(new Set(positions.map((item) => item.cycleId)).size).toBe(2)
  expect(positions.map((item) => item.jdRaw).sort()).toEqual(['春招专属 JD', '秋招专属 JD'])
  expect(applications).toHaveLength(1)
  expect(applications[0].cycleId).toBe(positions.find((item) => item.jdRaw === '秋招专属 JD')?.cycleId)
})


test('AC-03、AC-14：未配置 AI 时引导设置，配置后可提纯 JD 且原文默认隐藏', async ({ page }) => {
  await createFirstCycle(page)
  await page.goto('/#/positions')
  await page.getByRole('button', { name: /新增(第一个)?岗位/ }).first().click()
  await page.getByLabel('或快速新增公司').fill('模型科技')
  await page.getByLabel('岗位名称').fill('平台开发工程师')
  await page.getByPlaceholder('粘贴招聘网站中的原始 JD…').fill('导航栏 推荐岗位 原始噪声标记。职责：开发分布式服务。要求：熟悉 Go。加分：Kubernetes。版权信息。')
  await page.getByRole('button', { name: 'AI 提纯' }).click()
  await expect(page.getByRole('heading', { name: '设置', exact: true })).toBeVisible()

  await page.getByLabel('服务商名称').fill('测试模型服务')
  await page.locator('.password-input input').fill('sk-e2e-test')
  await page.getByRole('button', { name: '保存配置' }).click()
  await expect(page.getByText('AI 服务商配置已保存')).toBeVisible()

  await page.route('**/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: '平台开发工程师', department: '基础平台', locations: ['上海'], responsibilities: ['开发分布式服务'], requirements: ['熟悉 Go'], preferred: ['熟悉 Kubernetes'], keywords: ['Go', 'Kubernetes'], education: '本科及以上', other: [] }) } }] }),
    })
  })
  await page.goto('/#/positions')
  await expect(page.getByRole('heading', { name: '岗位库' })).toBeVisible()
  await page.getByRole('button', { name: /新增(第一个)?岗位/ }).first().click()
  await page.getByLabel('或快速新增公司').fill('模型科技')
  await page.getByLabel('岗位名称').fill('平台开发工程师')
  const rawJD = '导航栏 推荐岗位 原始噪声标记。职责：开发分布式服务。要求：熟悉 Go。加分：Kubernetes。版权信息。'
  await page.getByPlaceholder('粘贴招聘网站中的原始 JD…').fill(rawJD)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'AI 提纯' }).click()
  await expect(page.getByRole('textbox', { name: /岗位职责/ })).toHaveValue('开发分布式服务')
  await expect(page.getByRole('textbox', { name: /任职要求/ })).toHaveValue('熟悉 Go')
  await page.getByRole('button', { name: '保存岗位' }).click()
  await page.getByRole('row', { name: /平台开发工程师/ }).click()
  const detail = page.getByRole('dialog', { name: '平台开发工程师' })
  await expect(detail.getByText('开发分布式服务')).toBeVisible()
  await expect(detail.getByText('原始噪声标记')).toHaveCount(0)
  const positions = await storeRows<{ title: string; jdRaw: string }>(page, 'positions')
  expect(positions.find((item) => item.title === '平台开发工程师')?.jdRaw).toBe(rawJD)
})

test('AC-05：自定义招聘流程可插入主管面，既有历史快照保持不变', async ({ page }) => {
  await createFirstCycle(page)
  await createPosition(page)
  await startApplication(page)
  await page.getByLabel('切换当前阶段').selectOption({ label: '二面' })
  await page.getByRole('button', { name: '流程' }).click()
  await expect(page.getByText('待投递 → 二面')).toBeVisible()

  await page.getByRole('button', { name: '编辑' }).click()
  const dialog = page.getByRole('dialog', { name: '编辑招聘流程' })
  await dialog.getByLabel('阶段 7 名称').fill('技术二面')
  await dialog.getByRole('button', { name: '添加阶段' }).click()
  await dialog.getByLabel('阶段 11 名称').fill('主管面')
  for (let index = 0; index < 3; index += 1) await dialog.getByRole('button', { name: '上移' }).last().click()
  await dialog.getByRole('button', { name: '保存流程' }).click()

  await expect(page.getByRole('button', { name: /技术二面 面试/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /主管面 面试/ })).toBeVisible()
  await expect(page.getByText('待投递 → 二面')).toBeVisible()
})

test('AC-09：笔试日程同时出现在投递详情、本周事项和月历', async ({ page }) => {
  await createFirstCycle(page)
  await createPosition(page)
  await startApplication(page)
  await page.getByLabel('切换当前阶段').selectOption({ label: '笔试' })
  await page.getByRole('button', { name: '安排日程' }).click()
  await page.getByLabel('类型').selectOption('written_test')
  await page.getByLabel('标题').fill('后端开发笔试')
  const currentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  await page.getByLabel('日期').fill(currentDate)
  await page.getByLabel('开始时间').fill('19:00')
  await page.getByLabel('结束时间').fill('21:00')
  await page.getByRole('button', { name: '保存日程' }).click()

  await page.getByRole('button', { name: '日程', exact: true }).click()
  await expect(page.getByRole('button', { name: /后端开发笔试/ })).toBeVisible()
  await page.getByRole('link', { name: '总览' }).click()
  await expect(page.getByRole('button', { name: /后端开发笔试/ }).first()).toBeVisible()
  await expect(page.locator('.event-chip', { hasText: '后端开发笔试' })).toBeVisible()
})

test('AC-11、AC-12、AC-13：Secret 可显示复制但不进入普通导出，清空后可从首次页面恢复', async ({ page }) => {
  await createFirstCycle(page)
  await createPosition(page)
  await startApplication(page)

  await page.goto('/#/positions')
  await expect(page.getByRole('heading', { name: '岗位库' })).toBeVisible()
  await page.getByRole('button', { name: '公司与账号' }).click()
  await page.getByRole('button', { name: '添加账号' }).click()
  await page.getByRole('checkbox', { name: '用户名', exact: true }).check()
  await page.getByRole('textbox', { name: '手机号' }).fill('13800000000')
  await page.getByRole('textbox', { name: '用户名' }).fill('candidate_user')
  await page.getByLabel('密码').fill('TopSecret!2027')
  await page.getByRole('button', { name: '保存账号' }).click()
  await expect(page.getByText('138****0000')).toBeVisible()
  await expect(page.getByText('••••••••').last()).toBeVisible()
  await page.getByRole('button', { name: '显示敏感信息' }).click()
  await expect(page.getByText('TopSecret!2027')).toBeVisible()
  await page.getByRole('button', { name: '复制密码' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('TopSecret!2027')
  await page.getByRole('button', { name: '关闭' }).click()

  await page.goto('/#/settings')
  await page.getByLabel('服务商名称').fill('测试模型服务')
  await page.locator('.password-input input').fill('sk-never-export-this')
  await page.getByRole('button', { name: '保存配置' }).click()

  await page.goto('/#/data')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 JSON' }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()
  const exported = await readFile(downloadPath!, 'utf8')
  expect(exported).not.toContain('TopSecret!2027')
  expect(exported).not.toContain('candidate_user')
  expect(exported).not.toContain('13800000000')
  expect(exported).not.toContain('sk-never-export-this')
  expect(exported).toContain('后端开发工程师')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '清空普通数据' }).click()
  await expect(page.getByRole('heading', { name: '把招聘季，变成一条清晰的路径。' })).toBeVisible()
  expect(await storeRows(page, 'positions')).toHaveLength(0)

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '从备份恢复' }).click()
  const chooser = await fileChooserPromise
  await chooser.setFiles(downloadPath!)
  await expect(page.getByRole('dialog', { name: '确认导入' })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '全量替换' }).click()
  await expect(page.getByRole('heading', { name: '数据与备份' })).toBeVisible()
  await page.getByRole('link', { name: '岗位库' }).click()
  await expect(page.getByRole('row', { name: /后端开发工程师/ })).toBeVisible()
  expect(await storeRows(page, 'applications')).toHaveLength(1)
})

test('AC-15：生产静态页面可加载、刷新 Hash 路由且核心资源无失败', async ({ page }) => {
  const failures: string[] = []
  page.on('response', (response) => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`) })
  await page.goto('/')
  await expect(page).toHaveTitle('OfferFlow')
  await expect(page.getByRole('heading', { name: '把招聘季，变成一条清晰的路径。' })).toBeVisible()
  await createFirstCycle(page)
  await page.goto('/#/positions')
  await expect(page.getByRole('heading', { name: '岗位库' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '岗位库' })).toBeVisible()
  expect(failures).toEqual([])
})
