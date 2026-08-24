import { useMemo, useState, type FormEvent } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, ExternalLink, MapPin, Plus, Video } from 'lucide-react'
import { useApp } from '../../app/AppContext'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, Modal, Select } from '../../components/ui'

import type { RecruitmentEvent, RecruitmentEventType } from '../../types/domain'
import { completeEvent, deleteEvent, saveEvent } from './service'
import { MarkdownEditor, MarkdownView } from '../../components/Markdown'
import { InterviewModal } from '../interviews/InterviewUI'
import { currentStage, safeExternalUrl } from '../../lib/utils'

const typeOptions: Array<[RecruitmentEventType, string]> = [['assessment', '测评'], ['written_test', '笔试'], ['interview', '面试'], ['hr_interview', 'HR 面'], ['offer', 'Offer 沟通'], ['deadline', '截止时间'], ['follow_up', '跟进'], ['custom', '自定义']]
export const eventTypeLabels = Object.fromEntries(typeOptions) as Record<RecruitmentEventType, string>

export function EventModal({ open, onClose, applicationId, positionId, initialDate, edit }: { open: boolean; onClose: () => void; applicationId?: string; positionId?: string; initialDate?: string; edit?: RecruitmentEvent }) {
  const { currentCycleId, toast } = useApp()
  const [form, setForm] = useState<{ type: RecruitmentEventType; title: string; date: string; time: string; endTime: string; allDay: boolean; mode: NonNullable<RecruitmentEvent['mode']>; meetingUrl: string; location: string; notes: string }>(() => ({ type: edit?.type ?? 'interview' as RecruitmentEventType, title: edit?.title ?? '', date: edit?.startAt?.slice(0, 10) ?? initialDate ?? '', time: edit?.allDay ? '' : edit?.startAt?.slice(11, 16) ?? '', endTime: edit?.allDay ? '' : edit?.endAt?.slice(11, 16) ?? '', allDay: edit?.allDay ?? false, mode: edit?.mode ?? 'online', meetingUrl: edit?.meetingUrl ?? '', location: edit?.location ?? '', notes: edit?.notes ?? '' }))
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentCycleId || !form.title.trim()) return
    const values = new FormData(event.currentTarget)
    const date = String(values.get('date') ?? form.date)
    const time = String(values.get('time') ?? form.time)
    const endTime = String(values.get('endTime') ?? form.endTime)
    const startAt = date ? (form.allDay || !time ? `${date}T00:00:00` : `${date}T${time}:00`) : undefined
    const endAt = date && endTime && !form.allDay ? `${date}T${endTime}:00` : undefined
    await saveEvent({ cycleId: currentCycleId, applicationId: edit?.applicationId ?? applicationId, positionId: edit?.positionId ?? positionId, type: form.type, title: form.title.trim(), startAt, endAt, allDay: form.allDay, mode: form.mode, meetingUrl: form.meetingUrl || undefined, location: form.location || undefined, completed: edit?.completed ?? false, notes: form.notes || undefined }, edit)
    toast(edit ? '日程已更新' : '日程已创建')
    onClose()
  }
  return <Modal open={open} onClose={onClose} title={edit ? '编辑日程' : '安排日程'}>
    <form className="form-stack" onSubmit={submit}>
      <div className="form-grid"><Field label="类型"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RecruitmentEventType })}>{typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field><Field label="标题"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例如：腾讯一面" /></Field></div>
      <div className="form-grid"><Field label="日期"><Input name="date" required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="形式"><Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as NonNullable<RecruitmentEvent['mode']> })}><option value="online">线上</option><option value="offline">线下</option><option value="phone">电话</option><option value="unknown">待定</option></Select></Field></div>
      <label className="checkbox"><input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} />全天事项</label>
      {!form.allDay && <div className="form-grid"><Field label="开始时间"><Input name="time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field><Field label="结束时间"><Input name="endTime" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field></div>}
      <div className="form-grid"><Field label="会议链接"><Input type="url" value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} /></Field><Field label="地点"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field></div>
      <Field label="备注"><MarkdownEditor value={form.notes} onChange={(notes) => setForm({ ...form, notes })} rows={5} /></Field>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button>保存日程</Button></div>
    </form>
  </Modal>
}

export function CalendarPanel({ events, onCreate, onSelect }: { events: RecruitmentEvent[]; onCreate?: (date: string) => void; onSelect?: (event: RecruitmentEvent) => void }) {
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }), [month])
  return <section className="calendar-panel">
    <header><div><p className="eyebrow">月度日历</p><h2>{format(month, 'yyyy年 M月', { locale: zhCN })}</h2></div><div><Button aria-label="上个月" size="sm" variant="ghost" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft size={16} /></Button><Button size="sm" variant="secondary" onClick={() => setMonth(startOfMonth(new Date()))}>今天</Button><Button aria-label="下个月" size="sm" variant="ghost" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={16} /></Button></div></header>
    <div className="calendar-weekdays">{['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>周{day}</span>)}</div>
    <div className="calendar-grid">{days.map((day) => {
      const dayEvents = events.filter((event) => event.startAt && isSameDay(parseISO(event.startAt), day)).sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''))
      return <div key={day.toISOString()} className={`calendar-day ${!isSameMonth(day, month) ? 'outside' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`} onDoubleClick={() => onCreate?.(format(day, 'yyyy-MM-dd'))}>
        <button className="day-number" onClick={() => onCreate?.(format(day, 'yyyy-MM-dd'))}>{format(day, 'd')}</button>
        <div className="day-events">{dayEvents.slice(0, 3).map((event) => <button key={event.id} onClick={() => onSelect?.(event)} className={`event-chip event-${event.type}`}><span>{event.allDay ? '全天' : event.startAt?.slice(11, 16)}</span>{event.title}</button>)}{dayEvents.length > 3 && <small>+{dayEvents.length - 3} 项</small>}</div>
      </div>
    })}</div>
  </section>
}

export function EventDetailModal({ event, onClose }: { event?: RecruitmentEvent; onClose: () => void }) {
  const { cycles, applications, positions, companies, toast } = useApp()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [interviewOpen, setInterviewOpen] = useState(false)
  if (!event) return null
  const application = applications.find((item) => item.id === event.applicationId)
  const position = positions.find((item) => item.id === (event.positionId ?? application?.positionId))
  const company = companies.find((item) => item.id === position?.companyId)
  const readonly = cycles.find((cycle) => cycle.id === event.cycleId)?.status === 'archived'
  const modeLabel = event.mode ? ({ online: '线上', offline: '线下', phone: '电话', unknown: '待定' } as const)[event.mode] : undefined
  return <>
    <Modal open={!editing} onClose={onClose} title={event.title} subtitle={eventTypeLabels[event.type]}>
      <div className="event-context">{company && <strong>{company.name}</strong>}{position && <span>{position.title}</span>}</div>
      <div className="detail-list">
        <div><Clock size={17} /><span>{event.allDay ? `${event.startAt?.slice(0, 10)} · 全天` : event.startAt?.replace('T', ' ').slice(0, 16) ?? '未设置时间'}</span></div>
        {modeLabel && <div><Video size={17} /><span>{modeLabel}</span></div>}
        {event.location && <div><MapPin size={17} /><span>{event.location}</span></div>}
        {safeExternalUrl(event.meetingUrl) && <div><ExternalLink size={17} /><a href={event.meetingUrl} target="_blank" rel="noopener noreferrer">打开会议链接</a></div>}
      </div>
      {event.notes && <div className="event-notes"><MarkdownView value={event.notes} /></div>}
      <div className="modal-actions"><Button disabled={readonly} variant="danger" onClick={async () => { if (confirm('确认删除这个日程？')) { await deleteEvent(event); toast('日程已删除'); onClose() } }}>删除</Button><Button disabled={readonly} variant="secondary" onClick={() => setEditing(true)}>编辑</Button>{application && <Button variant="secondary" onClick={() => { navigate(`/applications/${application.id}`); onClose() }}>进入投递</Button>}{application && ['interview', 'hr_interview'].includes(event.type) && <Button disabled={readonly} variant="secondary" onClick={() => setInterviewOpen(true)}>记录面经</Button>}{!event.completed && <Button disabled={readonly} onClick={async () => { await completeEvent(event); toast('已标记完成'); onClose() }}>标记完成</Button>}</div>
    </Modal>
    {application && <InterviewModal open={interviewOpen} application={application} eventId={event.id} stageName={currentStage(application)?.name ?? event.title} onClose={() => setInterviewOpen(false)} />}
    <EventModal open={editing} onClose={() => { setEditing(false); onClose() }} edit={event} />
  </>
}
