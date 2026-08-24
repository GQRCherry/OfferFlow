import { useEffect, useState, type FormEvent } from 'react'
import { Building2, Copy, ExternalLink, Eye, EyeOff, KeyRound, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../app/AppContext'
import { Badge, Button, Field, IconButton, Input, Modal, Select, Textarea } from '../../components/ui'
import { createCompany, deleteCompanySafe } from '../../db/repositories'
import { db } from '../../db/schema'
import { normalizeName, nowIso, safeExternalUrl, uid } from '../../lib/utils'
import { readCareerAccountSecret, saveCareerAccountSecret } from '../../security/secrets'
import type { CareerAccountMeta, CareerAccountSecretPayload, Company, LoginMethod } from '../../types/domain'

export function CompanyModal({ open, onClose, company: initialCompany }: { open: boolean; onClose: () => void; company?: Company }) {
  const { toast } = useApp()
  const [form, setForm] = useState({ name: initialCompany?.name ?? '', websiteUrl: initialCompany?.websiteUrl ?? '', careerUrl: initialCompany?.careerUrl ?? '', notes: initialCompany?.notes ?? '' })
  useEffect(() => setForm({ name: initialCompany?.name ?? '', websiteUrl: initialCompany?.websiteUrl ?? '', careerUrl: initialCompany?.careerUrl ?? '', notes: initialCompany?.notes ?? '' }), [initialCompany, open])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return
    if (initialCompany) await db.companies.put({ ...initialCompany, ...form, name: normalizeName(form.name), websiteUrl: form.websiteUrl || undefined, careerUrl: form.careerUrl || undefined, notes: form.notes || undefined, updatedAt: nowIso() })
    else await createCompany(form)
    toast(initialCompany ? '公司信息已更新' : '公司已创建')
    onClose()
  }
  return <Modal open={open} onClose={onClose} title={initialCompany ? '编辑公司' : '新增公司'}>
    <form className="form-stack" onSubmit={submit}>
      <Field label="公司名称"><Input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="公司官网"><Input type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://" /></Field>
      <Field label="招聘官网"><Input type="url" value={form.careerUrl} onChange={(e) => setForm({ ...form, careerUrl: e.target.value })} placeholder="https://" /></Field>
      <Field label="备注"><Textarea rows={5} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button>保存</Button></div>
    </form>
  </Modal>
}

function AccountForm({ companyId, edit, onDone }: { companyId: string; edit?: CareerAccountMeta; onDone: () => void }) {
  const { toast } = useApp()
  const [form, setForm] = useState({ label: edit?.label ?? '校招官网', loginUrl: edit?.loginUrl ?? '', method: edit?.loginMethods[0] ?? 'phone' as LoginMethod, phone: '', email: '', username: '', password: '', wechatEnabled: edit?.wechatEnabled ?? false, notes: edit?.notes ?? '' })
  useEffect(() => { if (edit) readCareerAccountSecret(edit.id).then((secret) => setForm((value) => ({ ...value, phone: secret?.phone ?? '', email: secret?.email ?? '', username: secret?.username ?? '', password: secret?.password ?? '' }))).catch((error) => toast(error.message, 'error')) }, [edit, toast])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const timestamp = nowIso()
    const id = edit?.id ?? uid()
    const meta: CareerAccountMeta = { id, companyId, label: form.label || undefined, loginUrl: form.loginUrl || undefined, loginMethods: [form.method, ...(form.wechatEnabled && form.method !== 'wechat' ? ['wechat' as const] : [])], wechatEnabled: form.wechatEnabled, notes: form.notes || undefined, createdAt: edit?.createdAt ?? timestamp, updatedAt: timestamp }
    const secret: CareerAccountSecretPayload = { phone: form.phone || undefined, email: form.email || undefined, username: form.username || undefined, password: form.password || undefined }
    await db.transaction('rw', db.careerAccounts, db.careerAccountSecrets, async () => { await db.careerAccounts.put(meta); await saveCareerAccountSecret(id, secret) })
    toast('招聘官网账号已保存')
    onDone()
  }
  return <form className="form-stack inset-form" onSubmit={submit}>
    <div className="form-grid"><Field label="名称"><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></Field><Field label="主要登录方式"><Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as LoginMethod })}><option value="phone">手机号</option><option value="email">邮箱</option><option value="username">用户名</option><option value="wechat">微信</option><option value="other">其他</option></Select></Field></div>
    <Field label="登录页面"><Input type="url" value={form.loginUrl} onChange={(e) => setForm({ ...form, loginUrl: e.target.value })} /></Field>
    <div className="form-grid"><Field label="手机号"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="off" /></Field><Field label="邮箱"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" /></Field></div>
    <div className="form-grid"><Field label="用户名"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" /></Field><Field label="密码"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></Field></div>
    <label className="checkbox"><input type="checkbox" checked={form.wechatEnabled} onChange={(e) => setForm({ ...form, wechatEnabled: e.target.checked })} />也可使用微信登录</label>
    <Field label="备注"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
    <div className="modal-actions"><Button type="button" variant="ghost" onClick={onDone}>取消</Button><Button>保存账号</Button></div>
  </form>
}

function AccountCard({ account }: { account: CareerAccountMeta }) {
  const { toast } = useApp()
  const [secret, setSecret] = useState<CareerAccountSecretPayload>()
  const [visible, setVisible] = useState(false)
  const load = async () => { const value = await readCareerAccountSecret(account.id); setSecret(value); return value }
  const copy = async (key: keyof CareerAccountSecretPayload) => { const value = secret ?? await load(); const text = value?.[key]; if (!text) return toast('该字段尚未填写', 'info'); await navigator.clipboard.writeText(text); toast('已复制') }
  const primaryKey: keyof CareerAccountSecretPayload = account.loginMethods.includes('phone') ? 'phone' : account.loginMethods.includes('email') ? 'email' : 'username'
  return <article className="account-card"><header><div><KeyRound size={17} /><strong>{account.label || '招聘官网账号'}</strong></div><Badge>{account.loginMethods.map((method) => ({ phone: '手机号', email: '邮箱', username: '用户名', wechat: '微信', other: '其他' })[method]).join(' + ')}</Badge></header>
    <div className="secret-row"><span>账号</span><code>{visible ? (secret?.[primaryKey] ?? '未填写') : '••••••••'}</code><IconButton label="复制账号" onClick={() => copy(primaryKey)}><Copy size={15} /></IconButton></div>
    <div className="secret-row"><span>密码</span><code>{visible ? (secret?.password ?? '未填写') : '••••••••'}</code><IconButton label={visible ? '隐藏密码' : '显示密码'} onClick={async () => { if (!secret) await load(); setVisible((value) => !value) }}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}</IconButton><IconButton label="复制密码" onClick={() => copy('password')}><Copy size={15} /></IconButton></div>
    <footer>{safeExternalUrl(account.loginUrl) && <a href={account.loginUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />打开招聘官网</a>}<button onClick={async () => { if (confirm('确认删除这条招聘官网账号？')) { await db.transaction('rw', db.careerAccounts, db.careerAccountSecrets, async () => { await db.careerAccounts.delete(account.id); await db.careerAccountSecrets.delete(account.id) }); toast('账号已删除') } }}><Trash2 size={14} />删除</button></footer>
  </article>
}

export function CompanyManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companies, accounts, toast } = useApp()
  const [selectedId, setSelectedId] = useState<string>()
  const [companyModal, setCompanyModal] = useState(false)
  const [accountForm, setAccountForm] = useState(false)
  useEffect(() => { if (open && !selectedId && companies[0]) setSelectedId(companies[0].id) }, [open, selectedId, companies])
  const selected = companies.find((item) => item.id === selectedId)
  return <>
    <Modal wide open={open} onClose={onClose} title="公司与招聘官网账号" subtitle="公司可跨招聘季复用，密码与普通业务数据分开保存。">
      <div className="split-manager"><aside><Button className="full-width" variant="secondary" onClick={() => { setSelectedId(undefined); setCompanyModal(true) }}><Plus size={16} />新增公司</Button>{companies.map((company) => <button className={selectedId === company.id ? 'active' : ''} key={company.id} onClick={() => { setSelectedId(company.id); setAccountForm(false) }}><Building2 size={16} />{company.name}</button>)}</aside><section>
        {!selected ? <div className="empty-mini">选择或新增一家公司</div> : <><header className="detail-header"><div><p className="eyebrow">COMPANY</p><h2>{selected.name}</h2><p>{selected.careerUrl || selected.websiteUrl || '尚未填写官网'}</p></div><div><Button size="sm" variant="secondary" onClick={() => setCompanyModal(true)}>编辑</Button><Button size="sm" variant="danger" onClick={async () => { if (confirm(`确认删除“${selected.name}”？存在岗位时将拒绝删除。`)) try { await deleteCompanySafe(selected.id); setSelectedId(undefined); toast('公司已删除') } catch (error) { toast(error instanceof Error ? error.message : '删除失败', 'error') } }}>删除</Button></div></header>
          <div className="section-title"><div><h3>招聘官网账号</h3><p>密码默认遮罩，刷新页面后会重新隐藏。</p></div><Button size="sm" onClick={() => setAccountForm(true)}><Plus size={15} />添加账号</Button></div>
          {accountForm ? <AccountForm companyId={selected.id} onDone={() => setAccountForm(false)} /> : <div className="account-grid">{accounts.filter((item) => item.companyId === selected.id).map((account) => <AccountCard key={account.id} account={account} />)}{!accounts.some((item) => item.companyId === selected.id) && <div className="empty-mini">尚未保存招聘官网账号</div>}</div>}
        </>}
      </section></div>
    </Modal>
    <CompanyModal open={companyModal} company={selectedId ? selected : undefined} onClose={() => setCompanyModal(false)} />
  </>
}
