import { useMemo, useState, type FormEvent } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus } from 'lucide-react'
import { useApp } from '../../app/AppContext'
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui'
import { db } from '../../db/schema'
import { nowIso, uid } from '../../lib/utils'
import type { RecruitmentEvent, RecruitmentEventType } from '../../types/domain'

const typeOptions: Array<[RecruitmentEventType, string]> = [['assessment', '测评'], ['written_test', '笔试'], ['interview', '面试'], ['hr_interview', 'HR 面'], ['offer', 'Offer 沟通'], ['deadline', '截止时间'], ['follow_up', '跟进'], ['custom', '自定义']]
export const eventTypeLabels = Object.fromEntries(typeOptions) as Record<RecruitmentEventType, string>

export function EventModal({ open, onClose, applicationId, positionId, initialDate, edit }: { open: boolean; onClose: () => void; applicationId?: string; positionId?: string; initialDate?: string; edit?: RecruitmentEvent }) {
  const { currentCycleId, toast } = useApp()
  const [form, setForm] = useState<{ type: RecruitmentEventType; title: string; date: string; time: string; endTime: string; allDay: boolean; mode: NonNullable<RecruitmentEvent['mode']>; meetingUrl: string; location: string; notes: string }>(() => ({ type: edit?.type ?? 'interview' as RecruitmentEventType, title: edit?.title ?? '', date: edit?.startAt?.slice(0, 10) ?? initialDate ?? '', time: edit?.allDay ? '' : edit?.startAt?.slice(11, 16) ?? '', endTime: edit?.allDay ? '' : edit?.endAt?.slice(11, 16) ?? '', allDay: edit?.allDay ?? false, mode: edit?.mode ?? 'online', meetingUrl: edit?.meetingUrl ?? '', location: edit?.location ?? '', notes: edit?.notes ?? '' }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentCycleId || !form.title.trim()) return
    const timestamp = nowIso()
    const startAt = form.date ? (form.allDay || !form.time ? `${form.date}T00:00:00` : `${form.date}T${form.time}:00`) : undefined
    const endAt = form.date && form.endTime && !form.allDay ? `${form.date}T${form.endTime}:00` : undefined
    await db.events.put({ id: edit?.id ?? uid(), cycleId: currentCycleId, applicationId: edit?.applicationId ?? applicationId, positionId: edit?.positionId ?? positionId, type: form.type, title: form.title.trim(), startAt, endAt, allDay: form.allDay, mode: form.mode as RecruitmentEvent['mode'], meetingUrl: form.meetingUrl || undefined, location: form.location || undefined, completed: edit?.completed ?? false, notes: form.notes || undefined, createdAt: edit?.createdAt ?? timestamp, updatedAt: timestamp })
    toast(edit ? '日程已更新' : '日程已创建')
    onClose()
  }
  return <Modal open={open} onClose={onClose} title={edit ? '编辑日程' : '安排日程'}>
    <form className="form-stack" onSubmit={submit}>
      <div className="form-grid"><Field label="类型"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RecruitmentEventType })}>{typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field><Field label="标题"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例如：腾讯一面" /></Field></div>
      <div className="form-grid"><Field label="日期"><Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="形式"><Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as NonNullable<RecruitmentEvent['mode']> })}><option value="online">线上</option><option value="offline">线下</option><option value="phone">电话</option><option value="unknown">待定</option></Select></Field></div>
      <label className="checkbox"><input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} />全天事项</label>
      {!form.allDay && <div className="form-grid"><Field label="开始时间"><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field><Field label="结束时间"><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field></div>}
      <div className="form-grid"><Field label="会议链接"><Input type="url" value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} /></Field><Field label="地点"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field></div>
      <Field label="备注"><Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button>保存日程</Button></div>
    </form>
  </Modal>
}

export function CalendarPanel({ events, onCreate, onSelect }: { events: RecruitmentEvent[]; onCreate?: (date: string) => void; onSelect?: (event: RecruitmentEvent) => void }) {
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }), [month])
  return <section className="calendar-panel">
    <header><div><p className="eyebrow">MONTHLY</p><h2>{format(month, 'yyyy年 M月', { locale: zhCN })}</h2></div><div><Button size="sm" variant="ghost" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft size={16} /></Button><Button size="sm" variant="secondary" onClick={() => setMonth(startOfMonth(new Date()))}>今天</Button><Button size="sm" variant="ghost" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={16} /></Button></div></header>
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
  const { toast } = useApp()
  const [editing, setEditing] = useState(false)
  if (!event) return null
  return <>
    <Modal open={!editing} onClose={onClose} title={event.title} subtitle={eventTypeLabels[event.type]}>
      <div className="detail-list"><div><Clock size={17} /><span>{event.allDay ? `${event.startAt?.slice(0, 10)} · 全天` : event.startAt?.replace('T', ' ').slice(0, 16) ?? '未设置时间'}</span></div>{event.location && <div><MapPin size={17} /><span>{event.location}</span></div>}</div>
      {event.notes && <p className="pre-wrap">{event.notes}</p>}
      <div className="modal-actions"><Button variant="danger" onClick={async () => { if (confirm('确认删除这个日程？')) { await db.events.delete(event.id); toast('日程已删除'); onClose() } }}>删除</Button><Button variant="secondary" onClick={() => setEditing(true)}>编辑</Button>{!event.completed && <Button onClick={async () => { await db.events.update(event.id, { completed: true, updatedAt: nowIso() }); toast('已标记完成'); onClose() }}>标记完成</Button>}</div>
    </Modal>
    <EventModal open={editing} onClose={() => { setEditing(false); onClose() }} edit={event} />
  </>
}
