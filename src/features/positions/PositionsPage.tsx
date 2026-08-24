import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowUpRight, Bot, Building2, FilePlus2, Link as LinkIcon, MapPin, Pencil, Plus, Search, Send, Trash2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { Badge, Button, EmptyState, Field, IconButton, Input, Modal, Select, Textarea } from '../../components/ui'
import { MarkdownEditor, MarkdownView } from '../../components/Markdown'
import { createCompany, createPosition, deletePositionSafe, updatePosition } from '../../db/repositories'
import { emptyStructuredJD } from '../../lib/constants'
import { findSimilarCompanyNames, formatDate, normalizeName, safeExternalUrl } from '../../lib/utils'
import type { Position, StructuredJD } from '../../types/domain'
import { parseJD } from '../ai/service'
import { CompanyManager } from '../companies/CompanyUI'
import { ApplicationModal } from '../applications/ApplicationsPage'

function lines(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean) }
function toLines(value?: string[]) { return value?.join('\n') ?? '' }

function PositionModal({ open, onClose, position }: { open: boolean; onClose: () => void; position?: Position }) {
  const { companies, currentCycleId, providers, toast } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({ companyId: position?.companyId ?? companies[0]?.id ?? '', newCompany: '', title: position?.title ?? '', department: position?.department ?? '', locations: position?.locations.join('、') ?? '', category: position?.category ?? '', jobUrl: position?.jobUrl ?? '', officialUrl: position?.officialUrl ?? '', consultUrl: position?.consultUrl ?? '', jdRaw: position?.jdRaw ?? '', notes: position?.notes ?? '', responsibilities: toLines(position?.jdStructured?.responsibilities), requirements: toLines(position?.jdStructured?.requirements), preferred: toLines(position?.jdStructured?.preferred), keywords: position?.jdStructured?.keywords.join('、') ?? '', education: position?.jdStructured?.education ?? '', graduationRequirement: position?.jdStructured?.graduationRequirement ?? '', other: toLines(position?.jdStructured?.other) })
  const [parsing, setParsing] = useState(false)
  useEffect(() => { if (!position && !form.companyId && companies[0]) setForm((value) => ({ ...value, companyId: companies[0].id })) }, [companies, form.companyId, position])
  const structured = (): StructuredJD => ({ title: form.title || undefined, department: form.department || undefined, locations: form.locations.split(/[、,，]/).map((item) => item.trim()).filter(Boolean), responsibilities: lines(form.responsibilities), requirements: lines(form.requirements), preferred: lines(form.preferred), keywords: form.keywords.split(/[、,，]/).map((item) => item.trim()).filter(Boolean), education: form.education || undefined, graduationRequirement: form.graduationRequirement || undefined, other: lines(form.other) })
  const runAI = async () => {
    const provider = providers.find((item) => item.isDefault) ?? providers[0]
    if (!provider) { toast('请先在设置中配置 AI Provider', 'info'); navigate('/settings'); return }
    setParsing(true)
    try {
      const parsed = await parseJD(provider, form.jdRaw)
      setForm((value) => ({ ...value, title: parsed.title || value.title, department: parsed.department || value.department, locations: parsed.locations.join('、') || value.locations, responsibilities: toLines(parsed.responsibilities), requirements: toLines(parsed.requirements), preferred: toLines(parsed.preferred), keywords: parsed.keywords.join('、'), education: parsed.education ?? '', graduationRequirement: parsed.graduationRequirement ?? '', other: toLines(parsed.other) }))
      toast('JD 提纯完成')
    } catch (error) { toast(error instanceof Error ? error.message : 'AI 调用失败', 'error') } finally { setParsing(false) }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentCycleId || !form.title.trim()) return
    let companyId = form.companyId
    if (form.newCompany.trim()) {
      const similar = findSimilarCompanyNames(form.newCompany, companies.map((item) => item.name))
      if (similar.length && !confirm(`发现相似公司：${similar.join('、')}。仍要新建吗？`)) return
      companyId = (await createCompany({ name: form.newCompany, websiteUrl: '', careerUrl: '', notes: '' })).id
    }
    if (!companyId) return toast('请选择或新增公司', 'error')
    const payload = { cycleId: currentCycleId, companyId, title: normalizeName(form.title), department: form.department || undefined, locations: form.locations.split(/[、,，]/).map((item) => item.trim()).filter(Boolean), category: form.category || undefined, jobUrl: form.jobUrl || undefined, officialUrl: form.officialUrl || undefined, consultUrl: form.consultUrl || undefined, jdRaw: form.jdRaw || undefined, jdStructured: structured(), notes: form.notes || undefined }
    if (position) await updatePosition(position.id, payload)
    else await createPosition(payload)
    toast(position ? '岗位已更新' : '岗位已创建')
    onClose()
  }
  return <Modal wide open={open} onClose={onClose} title={position ? '编辑岗位' : '新增岗位'} subtitle="JD 原文用于重解析，日常详情仅展示结构化内容。">
    <form className="form-stack" onSubmit={submit}>
      <div className="form-grid"><Field label="选择公司"><Select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value, newCompany: '' })}><option value="">请选择</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select></Field><Field label="或快速新增公司"><Input value={form.newCompany} onChange={(e) => setForm({ ...form, newCompany: e.target.value, companyId: '' })} placeholder="输入新公司名称" /></Field></div>
      <div className="form-grid"><Field label="岗位名称"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="部门"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field></div>
      <div className="form-grid"><Field label="地点" hint="多个地点用顿号或逗号分隔"><Input value={form.locations} onChange={(e) => setForm({ ...form, locations: e.target.value })} /></Field><Field label="岗位类别"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field></div>
      <div className="form-grid three"><Field label="岗位链接"><Input type="url" value={form.jobUrl} onChange={(e) => setForm({ ...form, jobUrl: e.target.value })} /></Field><Field label="官网链接"><Input type="url" value={form.officialUrl} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} /></Field><Field label="咨询链接"><Input type="url" value={form.consultUrl} onChange={(e) => setForm({ ...form, consultUrl: e.target.value })} /></Field></div>
      <div className="raw-jd-section"><div className="section-title"><div><h3>JD 原始文本</h3><p>仅在编辑时显示，不进入全局搜索。</p></div><Button type="button" variant="secondary" onClick={runAI} disabled={parsing || !form.jdRaw.trim()}><Bot size={16} />{parsing ? '提纯中…' : 'AI 提纯'}</Button></div><Textarea rows={9} value={form.jdRaw} onChange={(e) => setForm({ ...form, jdRaw: e.target.value })} placeholder="粘贴招聘网站中的原始 JD…" /></div>
      <div className="structured-editor"><h3>结构化 JD</h3><div className="form-grid"><Field label="岗位职责" hint="每行一项"><Textarea rows={6} value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} /></Field><Field label="任职要求" hint="每行一项"><Textarea rows={6} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} /></Field></div><div className="form-grid"><Field label="加分项" hint="每行一项"><Textarea rows={4} value={form.preferred} onChange={(e) => setForm({ ...form, preferred: e.target.value })} /></Field><Field label="其他信息" hint="每行一项"><Textarea rows={4} value={form.other} onChange={(e) => setForm({ ...form, other: e.target.value })} /></Field></div><div className="form-grid"><Field label="关键词"><Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></Field><Field label="学历要求"><Input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} /></Field></div><Field label="毕业时间要求"><Input value={form.graduationRequirement} onChange={(e) => setForm({ ...form, graduationRequirement: e.target.value })} /></Field></div>
      <Field label="岗位备注"><MarkdownEditor value={form.notes} onChange={(notes) => setForm({ ...form, notes })} /></Field>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button>保存岗位</Button></div>
    </form>
  </Modal>
}

function PositionDetail({ position, onClose, onEdit }: { position?: Position; onClose: () => void; onEdit: () => void }) {
  const { companies, applications, toast } = useApp()
  const navigate = useNavigate()
  const [applicationOpen, setApplicationOpen] = useState(false)
  if (!position) return null
  const company = companies.find((item) => item.id === position.companyId)
  const application = applications.find((item) => item.positionId === position.id)
  const jd = position.jdStructured ?? emptyStructuredJD()
  const startApplication = () => {
    if (application) return navigate(`/applications/${application.id}`)
    setApplicationOpen(true)
  }
  return <Modal wide open onClose={onClose} title={position.title} subtitle={`${company?.name ?? '未知公司'} · ${position.locations.join(' / ') || '地点待定'}`}>
    <div className="detail-toolbar"><div className="link-row">{[['岗位', position.jobUrl], ['官网', position.officialUrl], ['咨询', position.consultUrl]].map(([label, url]) => safeExternalUrl(url) ? <a key={label} href={url} target="_blank" rel="noopener noreferrer"><LinkIcon size={14} />{label}<ArrowUpRight size={13} /></a> : null)}</div><div><Button variant="secondary" onClick={onEdit}><Pencil size={15} />编辑</Button><Button onClick={startApplication}><Send size={15} />{application ? '查看投递' : '开始投递'}</Button></div></div>
    <div className="jd-grid"><section><p className="eyebrow">岗位职责</p><h3>岗位职责</h3>{jd.responsibilities.length ? <ul>{jd.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">尚未整理</p>}</section><section><p className="eyebrow">任职要求</p><h3>任职要求</h3>{jd.requirements.length ? <ul>{jd.requirements.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">尚未整理</p>}</section></div>
    {!!jd.preferred.length && <section className="detail-section"><p className="eyebrow">加分项</p><h3>加分项</h3><ul>{jd.preferred.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    {!!jd.keywords.length && <div className="tag-row">{jd.keywords.map((item) => <Badge key={item} tone="purple">{item}</Badge>)}</div>}
    {(jd.education || jd.graduationRequirement) && <div className="meta-strip"><span>学历：{jd.education || '未说明'}</span><span>毕业时间：{jd.graduationRequirement || '未说明'}</span></div>}
    <section className="detail-section"><h3>备注</h3><MarkdownView value={position.notes} /></section>
    <ApplicationModal open={applicationOpen} preselectedPosition={position} onClose={() => setApplicationOpen(false)} />
  </Modal>
}

export function PositionsPage() {
  const { currentCycle, cyclePositions, companies, applications, toast } = useApp()
  const [params, setParams] = useSearchParams()
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<Position>()
  const [companyManager, setCompanyManager] = useState(false)
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState(params.get('company') ?? '')
  const [appliedFilter, setAppliedFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('')
  const [sort, setSort] = useState('updated')
  const [page, setPage] = useState(1)
  const selected = cyclePositions.find((item) => item.id === params.get('position'))
  const rows = useMemo(() => cyclePositions.filter((position) => {
    const company = companies.find((item) => item.id === position.companyId)
    const applied = applications.some((item) => item.positionId === position.id)
    return (!query || `${company?.name} ${position.title} ${position.locations.join(' ')}`.toLowerCase().includes(query.toLowerCase())) && (!companyFilter || position.companyId === companyFilter) && (!locationFilter || position.locations.includes(locationFilter)) && (appliedFilter === 'all' || (appliedFilter === 'yes') === applied)
  }).sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, 'zh-CN') : b.updatedAt.localeCompare(a.updatedAt)), [cyclePositions, companies, applications, query, companyFilter, locationFilter, appliedFilter, sort])
  const locations = [...new Set(cyclePositions.flatMap((item) => item.locations))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const pageSize = 50
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const visibleRows = rows.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize)
  const readonly = currentCycle?.status === 'archived'
  return <div className="page-content">
    <header className="page-heading"><div><p className="eyebrow">岗位管理</p><h1>岗位库</h1><p>保存关注岗位，维护结构化 JD，再从这里开始投递。</p></div><div className="heading-actions"><Button variant="secondary" onClick={() => setCompanyManager(true)}><Building2 size={17} />公司与账号</Button><Button disabled={readonly} onClick={() => { setEdit(undefined); setModal(true) }}><Plus size={17} />新增岗位</Button></div></header>
    {readonly && <div className="notice">当前招聘季已归档，内容以只读方式展示。恢复招聘季后可继续编辑。</div>}
    <div className="filter-bar"><label className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索公司、岗位或地点" /></label><Select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}><option value="">全部公司</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select><Select value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1) }}><option value="">全部地点</option>{locations.map((location) => <option key={location} value={location}>{location}</option>)}</Select><Select value={appliedFilter} onChange={(e) => setAppliedFilter(e.target.value)}><option value="all">全部状态</option><option value="yes">已投递</option><option value="no">未投递</option></Select><Select value={sort} onChange={(e) => setSort(e.target.value)}><option value="updated">最近更新</option><option value="name">岗位名称</option></Select></div>
    {!rows.length ? <EmptyState icon={<FilePlus2 />} title="还没有岗位" description="添加第一个岗位，原始 JD 和结构化结果会一起保存在本地。" action={!readonly && <Button onClick={() => setModal(true)}>新增第一个岗位</Button>} /> : <div className="table-wrap"><table><thead><tr><th>公司 / 岗位</th><th>地点</th><th>投递状态</th><th>更新时间</th><th aria-label="操作" /></tr></thead><tbody>{visibleRows.map((position) => { const company = companies.find((item) => item.id === position.companyId); const application = applications.find((item) => item.positionId === position.id); return <tr key={position.id} onClick={() => setParams({ position: position.id })}><td><strong>{position.title}</strong><span>{company?.name}</span></td><td><span className="inline-icon"><MapPin size={14} />{position.locations.join(' / ') || '待定'}</span></td><td><Badge tone={application ? 'success' : 'neutral'}>{application ? '已投递' : '未投递'}</Badge></td><td>{formatDate(position.updatedAt)}</td><td><div className="row-actions"><IconButton label="编辑" disabled={readonly} onClick={(e) => { e.stopPropagation(); setEdit(position); setModal(true) }}><Pencil size={15} /></IconButton><IconButton label="删除" disabled={readonly} onClick={async (e) => { e.stopPropagation(); if (confirm('确认删除该岗位？有关联投递时将拒绝删除。')) try { await deletePositionSafe(position.id); toast('岗位已删除') } catch (error) { toast(error instanceof Error ? error.message : '删除失败', 'error') } }}><Trash2 size={15} /></IconButton></div></td></tr> })}</tbody></table>{rows.length > pageSize && <div className="pagination"><span>共 {rows.length} 个岗位</span><div><Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</Button><span>{Math.min(page, pageCount)} / {pageCount}</span><Button size="sm" variant="ghost" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>下一页</Button></div></div>}</div>}
    <PositionModal key={`${modal}-${edit?.id}`} open={modal} position={edit} onClose={() => { setModal(false); setEdit(undefined) }} />
    <PositionDetail position={selected} onClose={() => setParams({})} onEdit={() => { setEdit(selected); setModal(true) }} />
    <CompanyManager open={companyManager} onClose={() => setCompanyManager(false)} />
  </div>
}
