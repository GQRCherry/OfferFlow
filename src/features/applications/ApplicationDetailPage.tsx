import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, CalendarPlus, ChevronDown, ChevronUp, Circle, GripVertical, Clock3, ExternalLink, FileText, History, MapPin, MessageSquareText, Pencil, Plus, Save, Trash2, UserRound } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { Badge, Button, EmptyState, Field, IconButton, Input, Modal, Select } from '../../components/ui'
import { MarkdownEditor, MarkdownView } from '../../components/Markdown'
import { applicationDeleteImpact, deleteApplicationCascade, updateApplicationMeta, updateApplicationNotes } from '../../db/repositories'
import { APPLICATION_RESULT_LABELS, APPLY_CHANNEL_LABELS, INTERVIEW_RESULT_LABELS, PIPELINE_CATEGORY_LABELS, PIPELINE_CATEGORY_ORDER } from '../../lib/constants'
import { currentStage, formatDate, formatDateTime, safeExternalUrl, uid } from '../../lib/utils'
import type { Application, ApplicationResult, ApplyChannel, PipelineCategory, PipelineStage, RecruitmentEvent } from '../../types/domain'
import { EventDetailModal, EventModal, eventTypeLabels } from '../events/EventUI'
import { InterviewModal } from '../interviews/InterviewUI'
import { changeApplicationResult, changeApplicationStage, updateApplicationPipeline } from '../pipeline/service'

const tabs = ['概览', 'JD', '流程', '日程', '面试 / 面经', '备注'] as const

function ApplicationMetaModal({ application, open, onClose }: { application: Application; open: boolean; onClose: () => void }) {
  const { toast } = useApp()
  const [form, setForm] = useState({ appliedAt: application.appliedAt ?? '', applyChannel: application.applyChannel ?? 'official' as ApplyChannel, applyChannelText: application.applyChannelText ?? '', resumeVersion: application.resumeVersion ?? '' })
  useEffect(() => setForm({ appliedAt: application.appliedAt ?? '', applyChannel: application.applyChannel ?? 'official', applyChannelText: application.applyChannelText ?? '', resumeVersion: application.resumeVersion ?? '' }), [application, open])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await updateApplicationMeta(application.id, form)
    toast('投递信息已更新')
    onClose()
  }
  return <Modal open={open} onClose={onClose} title="编辑投递信息">
    <form className="form-stack" onSubmit={submit}>
      <Field label="投递日期"><Input type="date" value={form.appliedAt} onChange={(event) => setForm({ ...form, appliedAt: event.target.value })} /></Field>
      <Field label="投递渠道"><Select value={form.applyChannel} onChange={(event) => setForm({ ...form, applyChannel: event.target.value as ApplyChannel })}>{Object.entries(APPLY_CHANNEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
      {form.applyChannel === 'other' && <Field label="渠道说明"><Input value={form.applyChannelText} onChange={(event) => setForm({ ...form, applyChannelText: event.target.value })} /></Field>}
      <Field label="简历版本"><Input value={form.resumeVersion} onChange={(event) => setForm({ ...form, resumeVersion: event.target.value })} placeholder="例如：后端-v3" /></Field>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button>保存投递信息</Button></div>
    </form>
  </Modal>
}

function SortableStageRow({ stage, index, isCurrent, canDelete, onChange, onMove, onRemove }: {
  stage: PipelineStage
  index: number
  isCurrent: boolean
  canDelete: boolean
  onChange: (stage: PipelineStage) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id })
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`${isCurrent ? 'current' : ''} ${isDragging ? 'dragging' : ''}`}>
    <button type="button" className="pipeline-drag-handle" aria-label={`拖动“${stage.name}”排序`} {...attributes} {...listeners}><GripVertical size={16} /></button>
    <Input aria-label={`阶段 ${index + 1} 名称`} value={stage.name} onChange={(event) => onChange({ ...stage, name: event.target.value })} />
    <Select aria-label={`阶段 ${index + 1} 大类`} value={stage.category} onChange={(event) => onChange({ ...stage, category: event.target.value as PipelineCategory })}>{PIPELINE_CATEGORY_ORDER.map((category) => <option key={category} value={category}>{PIPELINE_CATEGORY_LABELS[category]}</option>)}</Select>
    <IconButton label="上移" disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp size={16} /></IconButton>
    <IconButton label="下移" onClick={() => onMove(1)}><ChevronDown size={16} /></IconButton>
    <IconButton label="删除阶段" disabled={!canDelete} onClick={onRemove}><Trash2 size={16} /></IconButton>
  </div>
}

function PipelineEditor({ applicationId, stages, currentStageId, usedStageIds, onClose }: { applicationId: string; stages: PipelineStage[]; currentStageId: string; usedStageIds: Set<string>; onClose: () => void }) {
  const { toast } = useApp()
  const [items, setItems] = useState(stages.slice().sort((a, b) => a.order - b.order).map((item) => ({ ...item })))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    setItems(arrayMove(items, index, target).map((item, order) => ({ ...item, order })))
  }
  const remove = (id: string) => {
    if (id === currentStageId) return toast('不能删除当前所在阶段', 'error')
    if (usedStageIds.has(id)) return toast('该阶段已出现在流程历史中，不能删除；可以重命名或保留。', 'error')
    setItems(items.filter((item) => item.id !== id).map((item, order) => ({ ...item, order })))
  }
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    if (oldIndex >= 0 && newIndex >= 0) setItems(arrayMove(items, oldIndex, newIndex).map((item, order) => ({ ...item, order })))
  }
  const save = async () => { await updateApplicationPipeline(applicationId, items); toast('招聘流程已保存'); onClose() }
  return <Modal wide open onClose={onClose} title="编辑招聘流程" subtitle="可拖拽排序；阶段名称和顺序可变，但每个阶段必须映射到固定统计大类。">
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="pipeline-editor">{items.map((stage, index) => <SortableStageRow key={stage.id} stage={stage} index={index} isCurrent={stage.id === currentStageId} canDelete={stage.id !== currentStageId && !usedStageIds.has(stage.id)} onChange={(next) => setItems(items.map((item) => item.id === stage.id ? next : item))} onMove={(direction) => move(index, direction)} onRemove={() => remove(stage.id)} />)}<Button variant="secondary" onClick={() => setItems([...items, { id: uid(), name: '新阶段', category: 'interview', order: items.length }])}><Plus size={16} />添加阶段</Button></div>
      </SortableContext>
    </DndContext>
    <div className="modal-actions"><Button variant="ghost" onClick={onClose}>取消</Button><Button onClick={save}><Save size={16} />保存流程</Button></div>
  </Modal>
}

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: React.ReactNode }) { return <div className="meta-item"><span>{icon}</span><div><small>{label}</small><strong>{value || '未设置'}</strong></div></div> }

export function ApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentCycle, applications, positions, companies, histories, events, interviews, toast } = useApp()
  const application = applications.find((item) => item.id === id)
  const position = positions.find((item) => item.id === application?.positionId)
  const company = companies.find((item) => item.id === position?.companyId)
  const [tab, setTab] = useState<typeof tabs[number]>('概览')
  const [pipelineOpen, setPipelineOpen] = useState(false)
  const [metaOpen, setMetaOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<RecruitmentEvent>()
  const [interviewOpen, setInterviewOpen] = useState(false)
  const [notes, setNotes] = useState(application?.notes ?? '')
  const appHistories = useMemo(() => histories.filter((item) => item.applicationId === id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)), [histories, id])
  if (!application || !position) return <div className="page-content"><EmptyState title="未找到投递记录" description="该记录可能已被删除。" action={<Button onClick={() => navigate('/applications')}>返回投递</Button>} /></div>
  const stage = currentStage(application)
  const readonly = currentCycle?.id === application.cycleId && currentCycle.status === 'archived'
  const usedStageIds = new Set(appHistories.flatMap((item) => [item.fromStageId, item.toStageId].filter((value): value is string => !!value)))
  const appEvents = events.filter((item) => item.applicationId === application.id).sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''))
  const appInterviews = interviews.filter((item) => item.applicationId === application.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const advance = async (stageId: string) => { await changeApplicationStage(application.id, stageId); toast('流程已更新') }
  const setResult = async (result: ApplicationResult) => { await changeApplicationResult(application.id, result); toast('投递结果已更新') }
  return <div className="page-content detail-page">
    {readonly && <div className="notice">当前招聘季已归档，该投递以只读方式展示。</div>}
    <Link to="/applications" className="back-link"><ArrowLeft size={16} />返回投递看板</Link>
    <header className="application-hero"><div><div className="hero-kicker"><span className="company-avatar large-avatar">{company?.name.slice(0, 1)}</span><span>{company?.name ?? '未知公司'}</span></div><h1>{position.title}</h1><div className="hero-meta"><Badge tone="accent">{stage?.name}</Badge><Badge>{stage ? PIPELINE_CATEGORY_LABELS[stage.category] : ''}</Badge><span>{APPLICATION_RESULT_LABELS[application.result]}</span></div></div><div className="hero-actions"><Select disabled={readonly} aria-label="切换当前阶段" value={application.currentStageId} onChange={(e) => advance(e.target.value)}>{application.pipeline.slice().sort((a, b) => a.order - b.order).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Button disabled={readonly} onClick={() => setEventOpen(true)}><CalendarPlus size={16} />安排日程</Button></div></header>
    <nav className="detail-tabs">{tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === '概览' && <div className="detail-columns"><section className="panel"><header><div><h2>投递概览</h2><Button disabled={readonly} size="sm" variant="ghost" onClick={() => setMetaOpen(true)}><Pencil size={14} />编辑信息</Button></div><Select disabled={readonly} value={application.result} onChange={(e) => setResult(e.target.value as ApplicationResult)}><option value="active">进行中</option><option value="rejected">已拒绝</option><option value="withdrawn">已撤回</option><option value="closed">已关闭</option><option value="offer_accepted">已接受 Offer</option></Select></header><div className="meta-grid"><MetaItem icon={<MapPin size={17} />} label="地点" value={position.locations.join(' / ')} /><MetaItem icon={<Clock3 size={17} />} label="投递时间" value={formatDate(application.appliedAt)} /><MetaItem icon={<FileText size={17} />} label="简历版本" value={application.resumeVersion} /><MetaItem icon={<Circle size={17} />} label="投递渠道" value={application.applyChannel === 'other' ? application.applyChannelText : application.applyChannel ? APPLY_CHANNEL_LABELS[application.applyChannel] : undefined} /></div></section><section className="panel"><header><h2>相关链接</h2></header><div className="external-link-list">{[['岗位链接', position.jobUrl], ['公司官网', company?.websiteUrl], ['招聘官网', position.officialUrl || company?.careerUrl], ['咨询链接', position.consultUrl]].map(([label, url]) => safeExternalUrl(url) ? <a key={label} href={url} target="_blank" rel="noopener noreferrer"><span>{label}</span><ExternalLink size={16} /></a> : null)}{![position.jobUrl, company?.websiteUrl, position.officialUrl || company?.careerUrl, position.consultUrl].some(safeExternalUrl) && <p className="muted">暂无相关链接</p>}</div></section></div>}
    {tab === 'JD' && <section className="panel detail-section"><header><div><p className="eyebrow">结构化岗位描述</p><h2>岗位要求</h2></div><Button variant="secondary" onClick={() => navigate(`/positions?position=${position.id}`)}><Pencil size={15} />编辑岗位</Button></header><div className="jd-grid"><div><h3>岗位职责</h3><ul>{position.jdStructured?.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>任职要求</h3><ul>{position.jdStructured?.requirements.map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="detail-section"><h3>加分项</h3><ul>{position.jdStructured?.preferred.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="tag-row">{position.jdStructured?.keywords.map((item) => <Badge tone="purple" key={item}>{item}</Badge>)}</div></section>}
    {tab === '流程' && <div className="detail-columns pipeline-layout"><section className="panel"><header><div><p className="eyebrow">招聘流程</p><h2>当前流程</h2></div><Button disabled={readonly} variant="secondary" onClick={() => setPipelineOpen(true)}><Pencil size={15} />编辑</Button></header><div className="pipeline-rail">{application.pipeline.slice().sort((a, b) => a.order - b.order).map((item, index) => <button disabled={readonly} key={item.id} className={`${item.id === application.currentStageId ? 'active' : ''}`} onClick={() => advance(item.id)}><span className="rail-index">{index + 1}</span><div><strong>{item.name}</strong><small>{PIPELINE_CATEGORY_LABELS[item.category]}</small></div></button>)}</div></section><section className="panel"><header><div><p className="eyebrow">不可变更的历史记录</p><h2>流程历史</h2></div><History size={19} /></header><div className="history-list">{appHistories.map((item) => <div key={item.id}><span className="history-dot" /><div><strong>{item.action === 'created' ? `创建于 ${item.toStageNameSnapshot}` : item.action === 'stage_changed' ? `${item.fromStageNameSnapshot} → ${item.toStageNameSnapshot}` : item.action === 'result_changed' ? `结果变更为 ${item.resultSnapshot ? APPLICATION_RESULT_LABELS[item.resultSnapshot] : '未知'}` : item.note ?? '流程已更新'}</strong><p>{formatDateTime(item.occurredAt)}{item.note ? ` · ${item.note}` : ''}</p></div></div>)}</div></section></div>}
    {tab === '日程' && <section className="panel"><header><div><p className="eyebrow">日程安排</p><h2>相关日程</h2></div><Button disabled={readonly} onClick={() => setEventOpen(true)}><Plus size={16} />新增</Button></header>{!appEvents.length ? <EmptyState title="暂无日程" description="测评、笔试、面试和截止日期都可以关联到此投递。" /> : <div className="event-list">{appEvents.map((event) => <button key={event.id} onClick={() => setSelectedEvent(event)}><span className={`event-icon event-${event.type}`}><CalendarPlus size={16} /></span><div><strong>{event.title}</strong><p>{formatDateTime(event.startAt)} · {eventTypeLabels[event.type]}</p></div><Badge tone={event.completed ? 'success' : 'neutral'}>{event.completed ? '已完成' : '待处理'}</Badge></button>)}</div>}</section>}
    {tab === '面试 / 面经' && <section className="panel"><header><div><p className="eyebrow">面试记录</p><h2>每场面试与复盘</h2></div><Button disabled={readonly} onClick={() => setInterviewOpen(true)}><Plus size={16} />记录面经</Button></header>{!appInterviews.length ? <EmptyState icon={<UserRound />} title="还没有面经" description="为每一场面试分别记录问题、回答和个人复盘。" /> : <div className="interview-list">{appInterviews.map((interview) => <article key={interview.id}><header><div><span className="interview-index">{interview.stageNameSnapshot.slice(0, 2)}</span><div><h3>{interview.stageNameSnapshot}</h3><p>{formatDate(interview.createdAt)} · {interview.durationMinutes ? `${interview.durationMinutes} 分钟` : '时长未记录'}</p></div></div><Badge tone={interview.result === 'passed' ? 'success' : interview.result === 'failed' ? 'danger' : 'neutral'}>{INTERVIEW_RESULT_LABELS[interview.result ?? 'pending']}</Badge></header><MarkdownView value={interview.notes} empty="暂无面经正文" />{interview.reflection && <div className="reflection"><MessageSquareText size={16} /><div><strong>个人复盘</strong><MarkdownView value={interview.reflection} /></div></div>}</article>)}</div>}</section>}
    {tab === '备注' && <section className="panel notes-panel"><header><div><p className="eyebrow">投递备注</p><h2>投递备注</h2></div><Button disabled={readonly} onClick={async () => { await updateApplicationNotes(application.id, notes); toast('备注已保存') }}><Save size={16} />保存</Button></header><MarkdownEditor value={notes} onChange={setNotes} rows={18} /></section>}
    <div className="danger-zone"><div><strong>删除投递</strong><p>将同步删除流程历史、相关日程和面经。</p></div><Button disabled={readonly} variant="danger" onClick={async () => { const impact = await applicationDeleteImpact(application.id); if (confirm(`确认删除该投递？将同时删除 ${impact.history} 条流程历史、${impact.events} 项日程和 ${impact.interviews} 篇面经。此操作不可撤销。`)) { await deleteApplicationCascade(application.id); toast('投递已删除'); navigate('/applications') } }}><Trash2 size={15} />删除投递</Button></div>
    <ApplicationMetaModal application={application} open={metaOpen} onClose={() => setMetaOpen(false)} />
    {pipelineOpen && <PipelineEditor applicationId={application.id} stages={application.pipeline} currentStageId={application.currentStageId} usedStageIds={usedStageIds} onClose={() => setPipelineOpen(false)} />}
    <EventModal key={`${eventOpen}-${application.id}`} open={eventOpen} applicationId={application.id} positionId={position.id} onClose={() => setEventOpen(false)} />
    <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(undefined)} />
    <InterviewModal key={`${interviewOpen}-${application.id}`} open={interviewOpen} application={application} onClose={() => setInterviewOpen(false)} />
  </div>
}
