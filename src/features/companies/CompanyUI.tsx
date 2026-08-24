import { useEffect, useState, type FormEvent } from 'react'
import { Building2, Copy, ExternalLink, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../app/AppContext'
import { Badge, Button, Field, IconButton, Input, Modal, Textarea } from '../../components/ui'
import { MarkdownEditor, MarkdownView } from '../../components/Markdown'
import { createCompany, deleteCompanySafe, updateCompany } from '../../db/repositories'
import { copyText, findSimilarCompanyNames, maskSensitiveValue, safeExternalUrl } from '../../lib/utils'
import { readCareerAccountSecret } from '../../security/secrets'
import { deleteCareerAccount, saveCareerAccount } from './service'
import type { CareerAccountMeta, CareerAccountSecretPayload, Company, LoginMethod } from '../../types/domain'

const loginMethodLabels: Record<LoginMethod, string> = {
  phone: '手机号',
  email: '邮箱',
  username: '用户名',
  wechat: '微信',
  other: '其他',
}

export function CompanyModal({ open, onClose, company: initialCompany }: { open: boolean; onClose: () => void; company?: Company }) {
  const { companies, toast } = useApp()
  const [form, setForm] = useState({ name: initialCompany?.name ?? '', websiteUrl: initialCompany?.websiteUrl ?? '', careerUrl: initialCompany?.careerUrl ?? '', notes: initialCompany?.notes ?? '' })
  useEffect(() => setForm({ name: initialCompany?.name ?? '', websiteUrl: initialCompany?.websiteUrl ?? '', careerUrl: initialCompany?.careerUrl ?? '', notes: initialCompany?.notes ?? '' }), [initialCompany, open])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return
    if (!initialCompany) {
      const similar = findSimilarCompanyNames(form.name, companies.map((item) => item.name))
      if (similar.length && !confirm(`发现相似公司：${similar.join('、')}。仍要新建吗？`)) return
    }
    if (initialCompany) await updateCompany(initialCompany.id, form)
    else await createCompany(form)
    toast(initialCompany ? '公司信息已更新' : '公司已创建')
    onClose()
  }
  return <Modal open={open} onClose={onClose} title={initialCompany ? '编辑公司' : '新增公司'}>
    <form className="form-stack" onSubmit={submit}>
      <Field label="公司名称"><Input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <Field label="公司官网"><Input type="url" value={form.websiteUrl} onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })} placeholder="https://" /></Field>
      <Field label="招聘官网"><Input type="url" value={form.careerUrl} onChange={(event) => setForm({ ...form, careerUrl: event.target.value })} placeholder="https://" /></Field>
      <Field label="备注"><MarkdownEditor value={form.notes} onChange={(notes) => setForm({ ...form, notes })} rows={5} /></Field>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button>保存</Button></div>
    </form>
  </Modal>
}

function AccountForm({ companyId, edit, onDone }: { companyId: string; edit?: CareerAccountMeta; onDone: () => void }) {
  const { toast } = useApp()
  const [form, setForm] = useState({
    label: edit?.label ?? '校招官网',
    loginUrl: edit?.loginUrl ?? '',
    methods: edit?.loginMethods.length ? edit.loginMethods : ['phone'] as LoginMethod[],
    phone: '',
    email: '',
    username: '',
    password: '',
    notes: edit?.notes ?? '',
  })
  useEffect(() => {
    setForm((value) => ({ ...value, label: edit?.label ?? '校招官网', loginUrl: edit?.loginUrl ?? '', methods: edit?.loginMethods.length ? edit.loginMethods : ['phone'], notes: edit?.notes ?? '', phone: '', email: '', username: '', password: '' }))
    if (edit) readCareerAccountSecret(edit.id).then((secret) => setForm((value) => ({ ...value, phone: secret?.phone ?? '', email: secret?.email ?? '', username: secret?.username ?? '', password: secret?.password ?? '' }))).catch((error) => toast(error.message, 'error'))
  }, [edit, toast])
  const toggleMethod = (method: LoginMethod) => setForm((value) => ({ ...value, methods: value.methods.includes(method) ? value.methods.filter((item) => item !== method) : [...value.methods, method] }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.methods.length) return toast('请至少选择一种登录方式', 'error')
    const secret: CareerAccountSecretPayload = { phone: form.phone || undefined, email: form.email || undefined, username: form.username || undefined, password: form.password || undefined }
    await saveCareerAccount({ companyId, label: form.label, loginUrl: form.loginUrl, loginMethods: form.methods, notes: form.notes, secret }, edit)
    toast('招聘官网账号已保存')
    onDone()
  }
  return <form className="form-stack inset-form" onSubmit={submit}>
    <div className="form-grid"><Field label="名称"><Input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></Field><Field label="登录页面"><Input type="url" value={form.loginUrl} onChange={(event) => setForm({ ...form, loginUrl: event.target.value })} /></Field></div>
    <Field label="登录方式"><div className="method-options">{(Object.entries(loginMethodLabels) as Array<[LoginMethod, string]>).map(([method, label]) => <label key={method} className="checkbox"><input type="checkbox" checked={form.methods.includes(method)} onChange={() => toggleMethod(method)} />{label}</label>)}</div></Field>
    <div className="form-grid"><Field label="手机号"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="off" /></Field><Field label="邮箱"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="off" /></Field></div>
    <div className="form-grid"><Field label="用户名"><Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoComplete="off" /></Field><Field label="密码"><Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" /></Field></div>
    <Field label="备注"><Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
    <div className="modal-actions"><Button type="button" variant="ghost" onClick={onDone}>取消</Button><Button>保存账号</Button></div>
  </form>
}

function AccountCard({ account, onEdit }: { account: CareerAccountMeta; onEdit: () => void }) {
  const { toast } = useApp()
  const [secret, setSecret] = useState<CareerAccountSecretPayload>()
  const [visible, setVisible] = useState(false)
  const load = async () => { const value = await readCareerAccountSecret(account.id); setSecret(value); return value }
  useEffect(() => { load().catch((error) => toast(error.message, 'error')) }, [account.id])
  const copy = async (key: keyof CareerAccountSecretPayload) => {
    const value = secret ?? await load()
    const text = value?.[key]
    if (!text) return toast('该字段尚未填写', 'info')
    await copyText(text)
    toast('已复制')
  }
  const accountRows: Array<[string, keyof CareerAccountSecretPayload]> = []
  if (account.loginMethods.includes('phone')) accountRows.push(['手机号', 'phone'])
  if (account.loginMethods.includes('email')) accountRows.push(['邮箱', 'email'])
  if (account.loginMethods.includes('username') || account.loginMethods.includes('other')) accountRows.push(['用户名', 'username'])
  return <article className="account-card">
    <header><div><KeyRound size={17} /><strong>{account.label || '招聘官网账号'}</strong></div><Badge>{account.loginMethods.map((method) => loginMethodLabels[method]).join(' + ')}</Badge></header>
    {accountRows.map(([label, key]) => <div className="secret-row" key={key}><span>{label}</span><code>{visible ? (secret?.[key] ?? '未填写') : maskSensitiveValue(secret?.[key], key === 'phone' ? 'phone' : key === 'email' ? 'email' : 'username')}</code><span /><IconButton label={`复制${label}`} onClick={() => copy(key)}><Copy size={15} /></IconButton></div>)}
    {account.loginMethods.includes('wechat') && <div className="secret-row"><span>微信</span><code>微信授权登录</code><span /><span /></div>}
    <div className="secret-row"><span>密码</span><code>{visible ? (secret?.password ?? '未填写') : '••••••••'}</code><IconButton label={visible ? '隐藏敏感信息' : '显示敏感信息'} onClick={async () => { if (!secret) await load(); setVisible((value) => !value) }}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}</IconButton><IconButton label="复制密码" onClick={() => copy('password')}><Copy size={15} /></IconButton></div>
    <footer><button type="button" onClick={onEdit}><Pencil size={14} />编辑</button>{safeExternalUrl(account.loginUrl) && <a href={account.loginUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />打开招聘官网</a>}<button type="button" onClick={async () => { if (confirm('确认删除这条招聘官网账号？')) { await deleteCareerAccount(account.id); toast('账号已删除') } }}><Trash2 size={14} />删除</button></footer>
  </article>
}

export function CompanyManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companies, accounts, toast } = useApp()
  const [selectedId, setSelectedId] = useState<string>()
  const [companyModal, setCompanyModal] = useState(false)
  const [accountForm, setAccountForm] = useState(false)
  const [editAccount, setEditAccount] = useState<CareerAccountMeta>()
  useEffect(() => { if (open && !selectedId && companies[0]) setSelectedId(companies[0].id) }, [open, selectedId, companies])
  const selected = companies.find((item) => item.id === selectedId)
  return <>
    <Modal wide open={open} onClose={onClose} title="公司与招聘官网账号" subtitle="公司可跨招聘季复用，密码与普通业务数据分开保存。">
      <div className="split-manager"><aside><Button className="full-width" variant="secondary" onClick={() => { setSelectedId(undefined); setCompanyModal(true) }}><Plus size={16} />新增公司</Button>{companies.map((company) => <button className={selectedId === company.id ? 'active' : ''} key={company.id} onClick={() => { setSelectedId(company.id); setAccountForm(false); setEditAccount(undefined) }}><Building2 size={16} />{company.name}</button>)}</aside><section>
        {!selected ? <div className="empty-mini">选择或新增一家公司</div> : <><header className="detail-header"><div><p className="eyebrow">公司信息</p><h2>{selected.name}</h2><p>{selected.careerUrl || selected.websiteUrl || '尚未填写官网'}</p></div><div><Button size="sm" variant="secondary" onClick={() => setCompanyModal(true)}>编辑</Button><Button size="sm" variant="danger" onClick={async () => { if (confirm(`确认删除“${selected.name}”？存在岗位时将拒绝删除。`)) try { await deleteCompanySafe(selected.id); setSelectedId(undefined); toast('公司已删除') } catch (error) { toast(error instanceof Error ? error.message : '删除失败', 'error') } }}>删除</Button></div></header>
          {selected.notes && <div className="company-notes"><MarkdownView value={selected.notes} /></div>}
          <div className="section-title"><div><h3>招聘官网账号</h3><p>密码默认遮罩，刷新页面后会重新隐藏。</p></div><Button size="sm" onClick={() => { setEditAccount(undefined); setAccountForm(true) }}><Plus size={15} />添加账号</Button></div>
          {accountForm ? <AccountForm companyId={selected.id} edit={editAccount} onDone={() => { setAccountForm(false); setEditAccount(undefined) }} /> : <div className="account-grid">{accounts.filter((item) => item.companyId === selected.id).map((account) => <AccountCard key={account.id} account={account} onEdit={() => { setEditAccount(account); setAccountForm(true) }} />)}{!accounts.some((item) => item.companyId === selected.id) && <div className="empty-mini">尚未保存招聘官网账号</div>}</div>}
        </>}
      </section></div>
    </Modal>
    <CompanyModal open={companyModal} company={selectedId ? selected : undefined} onClose={() => setCompanyModal(false)} />
  </>
}
