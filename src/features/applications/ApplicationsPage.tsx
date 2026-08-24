import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { BriefcaseBusiness, CalendarClock, GripVertical, LayoutGrid, List, MapPin, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { Badge, Button, EmptyState, Field, Input, Modal, Select } from '../../components/ui'
import { createApplication, createCompany, createPosition } from '../../db/repositories'
import { APPLICATION_RESULT_LABELS, APPLY_CHANNEL_LABELS, PIPELINE_CATEGORY_LABELS, PIPELINE_CATEGORY_ORDER, createDefaultPipeline } from '../../lib/constants'
import { currentStage, findSimilarCompanyNames, formatDate, formatDateTime } from '../../lib/utils'
import type { Application, ApplyChannel, PipelineCategory, PipelineStage, Position } from '../../types/domain'
import { changeApplicationStage, copyPipeline, updateApplicationPipeline } from '../pipeline/service'

export function ApplicationModal({ open, onClose, preselectedPosition }: { open: boolean; onClose: () => void; preselectedPosition?: Position }) {
  const { currentCycleId, companies, cyclePositions, cycleApplications, toast } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({ positionId: preselectedPosition?.id ?? '', companyId: preselectedPosition?.companyId ?? companies[0]?.id ?? '', newCompany: '', newPosition: '', appliedAt: new Date().toISOString().slice(0, 10), channel: 'official' as ApplyChannel, channelText: '', sourceApplicationId: '' })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentCycleId) return
    let positionId = form.positionId
    if (!positionId) {
      let companyId = form.companyId
      if (form.newCompany.trim()) {
        const similar = findSimilarCompanyNames(form.newCompany, companies.map((item) => item.name))
        if (similar.length && !confirm(`发现相似公司：${similar.join('、')}。仍要新建吗？`)) return
        companyId = (await createCompany({ name: form.newCompany, websiteUrl: '', careerUrl: '', notes: '' })).id
      }
      if (!companyId || !form.newPosition.trim()) return toast('请选择岗位，或填写公司与岗位名称', 'error')
      positionId = (await createPosition({ cycleId: currentCycleId, companyId, title: form.newPosition, locations: [] })).id
    }
    const source = cycleApplications.find((item) => item.id === form.sourceApplicationId)
    const application = await createApplication({ cycleId: currentCycleId, positionId, appliedAt: form.appliedAt || undefined, applyChannel: form.channel, applyChannelText: form.channel === 'other' ? form.channelText : undefined, pipeline: source ? copyPipeline(source.pipeline) : createDefaultPipeline() })
    toast('投递已创建')
    onClose()
    navigate(`/applications/${application.id}`)
  }
  return <Modal open={open} onClose={onClose} title="快速新增投递" subtitle="可选择已有岗位，也可一步创建公司与岗位。">
    <form className="form-stack" onSubmit={submit}>
      <Field label="已有岗位"><Select value={form.positionId} onChange={(e) => setForm({ ...form, positionId: e.target.value })}><option value="">快速创建新岗位</option>{cyclePositions.map((position) => { const company = companies.find((item) => item.id === position.companyId); return <option key={position.id} value={position.id}>{company?.name} · {position.title}</option> })}</Select></Field>
      {!form.positionId && <><div className="form-grid"><Field label="公司"><Select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value, newCompany: '' })}><option value="">请选择</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select></Field><Field label="或新增公司"><Input value={form.newCompany} onChange={(e) => setForm({ ...form, newCompany: e.target.value, companyId: '' })} /></Field></div><Field label="岗位名称"><Input required value={form.newPosition} onChange={(e) => setForm({ ...form, newPosition: e.target.value })} /></Field></>}
      <div className="form-grid"><Field label="投递日期"><Input type="date" value={form.appliedAt} onChange={(e) => setForm({ ...form, appliedAt: e.target.value })} /></Field><Field label="投递渠道"><Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as ApplyChannel })}>{Object.entries(APPLY_CHANNEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field></div>
      {form.channel === 'other' && <Field label="渠道说明"><Input value={form.channelText} onChange={(e) => setForm({ ...form, channelText: e.target.value })} /></Field>}
      <Field label="Pipeline"><Select value={form.sourceApplicationId} onChange={(e) => setForm({ ...form, sourceApplicationId: e.target.value })}><option value="">使用默认流程</option>{cycleApplications.map((application) => { const position = cyclePositions.find((item) => item.id === application.positionId); const company = companies.find((item) => item.id === position?.companyId); return <option key={application.id} value={application.id}>复制：{company?.name} · {position?.title}</option> })}</Select></Field>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button>创建投递</Button></div>
    </form>
  </Modal>
}

function DraggableCard({ application, children }: { application: Application; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: application.id })
  return <article ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} className={`application-card ${isDragging ? 'dragging' : ''}`} {...attributes}><button className="drag-handle" aria-label="拖动投递卡片" {...listeners}><GripVertical size={15} /></button>{children}</article>
}

function BoardColumn({ category, count, children }: { category: PipelineCategory; count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: category })
  return <section ref={setNodeRef} className={`board-column board-${category} ${isOver ? 'over' : ''}`}><header><span>{PIPELINE_CATEGORY_LABELS[category]}</span><Badge>{count}</Badge></header><div className="board-cards">{children}</div></section>
}

export function ApplicationsPage() {
  const { currentCycle, cycleApplications, cyclePositions, cycleEvents, companies, toast } = useApp()
  const navigate = useNavigate()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [company, setCompany] = useState('')
  const [category, setCategory] = useState('')
  const [result, setResult] = useState('active')
  const [channel, setChannel] = useState('')
  const [location, setLocation] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState('updated')
  const [page, setPage] = useState(1)
  const [boardLimit, setBoardLimit] = useState(150)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const nextEvent = (id: string) => cycleEvents.filter((item) => item.applicationId === id && item.startAt && !item.completed && item.startAt >= new Date().toISOString()).sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''))[0]
  const filtered = useMemo(() => cycleApplications.filter((application) => {
    const position = cyclePositions.find((item) => item.id === application.positionId)
    const owner = companies.find((item) => item.id === position?.companyId)
    const stage = currentStage(application)
    return (!query || `${owner?.name} ${position?.title} ${stage?.name} ${position?.locations.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
      && (!company || owner?.id === company)
      && (!category || stage?.category === category)
      && (!result || application.result === result)
      && (!channel || application.applyChannel === channel)
      && (!location || position?.locations.includes(location))
      && (!dateFrom || (application.appliedAt ?? '') >= dateFrom)
      && (!dateTo || (application.appliedAt ?? '') <= dateTo)
  }).sort((a, b) => {
    if (sort === 'applied') return (b.appliedAt ?? '').localeCompare(a.appliedAt ?? '')
    if (sort === 'company') {
      const companyA = companies.find((item) => item.id === cyclePositions.find((position) => position.id === a.positionId)?.companyId)?.name ?? ''
      const companyB = companies.find((item) => item.id === cyclePositions.find((position) => position.id === b.positionId)?.companyId)?.name ?? ''
      return companyA.localeCompare(companyB, 'zh-CN')
    }
    if (sort === 'next') return (nextEvent(a.id)?.startAt ?? '9999').localeCompare(nextEvent(b.id)?.startAt ?? '9999')
    return b.updatedAt.localeCompare(a.updatedAt)
  }), [cycleApplications, cyclePositions, cycleEvents, companies, query, company, category, result, channel, location, dateFrom, dateTo, sort])
  const locations = [...new Set(cyclePositions.flatMap((item) => item.locations))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const pageSize = 50
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleList = filtered.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize)
  const visibleBoard = filtered.slice(0, boardLimit)
  const card = (application: Application) => {
    const position = cyclePositions.find((item) => item.id === application.positionId)
    const owner = companies.find((item) => item.id === position?.companyId)
    const stage = currentStage(application)
    const event = nextEvent(application.id)
    return <DraggableCard key={application.id} application={application}><button className="card-main" onClick={() => navigate(`/applications/${application.id}`)}><div className="card-company"><span className="company-avatar">{owner?.name.slice(0, 1)}</span><strong>{owner?.name ?? '未知公司'}</strong></div><h3>{position?.title ?? '未知岗位'}</h3><div className="card-meta"><Badge tone="accent">{stage?.name ?? '未设置'}</Badge>{position?.locations[0] && <span><MapPin size={13} />{position.locations[0]}</span>}</div><div className="card-footer"><span>{formatDate(application.appliedAt, '待投递')}</span><span>{application.applyChannel ? APPLY_CHANNEL_LABELS[application.applyChannel] : '未设置渠道'}</span></div>{event && <div className="next-event"><CalendarClock size={14} />{formatDateTime(event.startAt)} · {event.title}</div>}</button></DraggableCard>
  }
  const readonly = currentCycle?.status === 'archived'
  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (readonly || !over || !PIPELINE_CATEGORY_ORDER.includes(over.id as PipelineCategory)) return
    const application = cycleApplications.find((item) => item.id === active.id)
    if (!application) return
    const target = over.id as PipelineCategory
    const candidates = application.pipeline.filter((stage) => stage.category === target)
    let next: PipelineStage | undefined
    if (candidates.length === 1) next = candidates[0]
    else if (candidates.length > 1) {
      const answer = window.prompt(`选择具体阶段：\n${candidates.map((stage, index) => `${index + 1}. ${stage.name}`).join('\n')}`, '1')
      next = candidates[Number(answer) - 1]
    } else {
      const name = window.prompt(`该投递没有“${PIPELINE_CATEGORY_LABELS[target]}”阶段，请输入要新增的具体阶段名称：`, PIPELINE_CATEGORY_LABELS[target])
      if (name?.trim()) {
        next = { id: crypto.randomUUID(), name: name.trim(), category: target, order: application.pipeline.length }
        await updateApplicationPipeline(application.id, [...application.pipeline, next])
      }
    }
    if (next) { await changeApplicationStage(application.id, next.id); toast(`已推进至 ${next.name}`) }
  }
  return <div className="page-content wide-page">
    <header className="page-heading"><div><p className="eyebrow">投递管理</p><h1>投递流程</h1><p>用固定大类统一查看，用自定义阶段表达真实流程。</p></div><div className="heading-actions"><div className="segmented"><Button size="sm" variant={view === 'board' ? 'secondary' : 'ghost'} onClick={() => setView('board')}><LayoutGrid size={15} />看板</Button><Button size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} onClick={() => setView('list')}><List size={15} />列表</Button></div><Button disabled={readonly} onClick={() => setCreating(true)}><Plus size={17} />新增投递</Button></div></header>
    {readonly && <div className="notice">当前招聘季已归档，投递流程以只读方式展示。</div>}
    <div className="filter-bar application-filters"><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="搜索公司、岗位、阶段" /></label><Select value={company} onChange={(event) => { setCompany(event.target.value); setPage(1) }}><option value="">全部公司</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }}><option value="">全部大类</option>{PIPELINE_CATEGORY_ORDER.map((item) => <option key={item} value={item}>{PIPELINE_CATEGORY_LABELS[item]}</option>)}</Select><Select value={result} onChange={(event) => { setResult(event.target.value); setPage(1) }}><option value="active">进行中</option><option value="">全部结果</option><option value="rejected">已拒绝</option><option value="withdrawn">已撤回</option><option value="closed">已关闭</option><option value="offer_accepted">已接受 Offer</option></Select><Select value={channel} onChange={(event) => { setChannel(event.target.value); setPage(1) }}><option value="">全部渠道</option>{Object.entries(APPLY_CHANNEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Select value={location} onChange={(event) => { setLocation(event.target.value); setPage(1) }}><option value="">全部地点</option>{locations.map((item) => <option key={item} value={item}>{item}</option>)}</Select><Input aria-label="投递开始日期" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1) }} /><Input aria-label="投递结束日期" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1) }} /><Select value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">最近更新</option><option value="applied">投递时间</option><option value="next">下一事项</option><option value="company">公司名称</option></Select></div>
    {!filtered.length ? <EmptyState icon={<BriefcaseBusiness />} title="还没有投递记录" description="从岗位库开始投递，或者快速创建公司、岗位和投递。" action={!readonly && <Button onClick={() => setCreating(true)}>快速新增投递</Button>} /> : view === 'board' ? <><DndContext sensors={sensors} onDragEnd={onDragEnd}><div className="kanban-board">{PIPELINE_CATEGORY_ORDER.map((item) => { const items = visibleBoard.filter((application) => currentStage(application)?.category === item); const total = filtered.filter((application) => currentStage(application)?.category === item).length; return <BoardColumn key={item} category={item} count={total}>{items.map(card)}</BoardColumn> })}</div></DndContext>{filtered.length > boardLimit && <div className="load-more"><span>为保证流畅，当前展示前 {boardLimit} 条，共 {filtered.length} 条。</span><Button variant="secondary" onClick={() => setBoardLimit((value) => value + 150)}>继续加载</Button></div>}</> : <div className="table-wrap"><table><thead><tr><th>公司 / 岗位</th><th>当前阶段</th><th>大类</th><th>投递时间</th><th>渠道</th><th>下一事项</th><th>结果</th></tr></thead><tbody>{visibleList.map((application) => { const position = cyclePositions.find((item) => item.id === application.positionId); const owner = companies.find((item) => item.id === position?.companyId); const stage = currentStage(application); const event = nextEvent(application.id); return <tr key={application.id} onClick={() => navigate(`/applications/${application.id}`)}><td><strong>{position?.title}</strong><span>{owner?.name}</span></td><td>{stage?.name}</td><td><Badge>{stage ? PIPELINE_CATEGORY_LABELS[stage.category] : '未知'}</Badge></td><td>{formatDate(application.appliedAt)}</td><td>{application.applyChannel ? APPLY_CHANNEL_LABELS[application.applyChannel] : '-'}</td><td>{formatDateTime(event?.startAt, '-')}</td><td><Badge tone={application.result === 'active' ? 'success' : application.result === 'offer_accepted' ? 'purple' : 'neutral'}>{APPLICATION_RESULT_LABELS[application.result]}</Badge></td></tr> })}</tbody></table>{filtered.length > pageSize && <div className="pagination"><span>共 {filtered.length} 条投递</span><div><Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</Button><span>{Math.min(page, pageCount)} / {pageCount}</span><Button size="sm" variant="ghost" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>下一页</Button></div></div>}</div>}
    <ApplicationModal open={creating} onClose={() => setCreating(false)} />
  </div>
}
