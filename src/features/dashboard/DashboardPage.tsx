import { useMemo, useState } from 'react'
import { AlertCircle, ArrowUpRight, BriefcaseBusiness, CalendarClock, CalendarPlus, CheckCircle2, FileSearch, Sparkles } from 'lucide-react'
import { addHours, differenceInCalendarDays, endOfWeek, isAfter, isBefore, parseISO, startOfDay, startOfWeek } from 'date-fns'
import { Link } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { Badge, Button, EmptyState } from '../../components/ui'
import { currentStage, relativeDay } from '../../lib/utils'
import type { RecruitmentEvent } from '../../types/domain'
import { CalendarPanel, EventDetailModal, EventModal, eventTypeLabels } from '../events/EventUI'

export function DashboardPage() {
  const { currentCycle, cyclePositions, cycleApplications, cycleEvents, companies, positions } = useApp()
  const [eventOpen, setEventOpen] = useState(false)
  const [initialDate, setInitialDate] = useState<string>()
  const [selectedEvent, setSelectedEvent] = useState<RecruitmentEvent>()
  const stats = useMemo(() => ({
    positions: cyclePositions.length,
    applied: cycleApplications.filter((item) => currentStage(item)?.category !== 'todo').length,
    pre: cycleApplications.filter((item) => currentStage(item)?.category === 'pre_interview' && item.result === 'active').length,
    interview: cycleApplications.filter((item) => currentStage(item)?.category === 'interview' && item.result === 'active').length,
    offer: cycleApplications.filter((item) => currentStage(item)?.category === 'offer' && item.result === 'active').length,
    accepted: cycleApplications.filter((item) => item.result === 'offer_accepted').length,
  }), [cyclePositions, cycleApplications])
  const today = startOfDay(new Date())
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const weekEvents = cycleEvents.filter((event) => event.startAt && !isBefore(parseISO(event.startAt), weekStart) && !isAfter(parseISO(event.startAt), weekEnd)).sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''))
  const stale = cycleApplications.filter((application) => application.result === 'active' && differenceInCalendarDays(today, parseISO(application.updatedAt)) >= 7)
  const attentionEvents = cycleEvents.filter((event) => event.startAt && !event.completed && !isBefore(parseISO(event.startAt), new Date()) && !isAfter(parseISO(event.startAt), addHours(new Date(), event.type === 'deadline' ? 72 : 48))).sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''))
  const hasAttention = stale.length > 0 || attentionEvents.length > 0
  const readonly = currentCycle?.status === 'archived'
  const kpis = [
    ['岗位库', stats.positions, FileSearch, 'kpi-sage'], ['已投递', stats.applied, BriefcaseBusiness, 'kpi-blue'], ['前置流程', stats.pre, Sparkles, 'kpi-amber'], ['面试中', stats.interview, CalendarClock, 'kpi-purple'], ['Offer', stats.offer, CheckCircle2, 'kpi-green'],
  ] as const
  const describe = (event: RecruitmentEvent) => {
    const application = cycleApplications.find((item) => item.id === event.applicationId)
    const position = positions.find((item) => item.id === (event.positionId ?? application?.positionId))
    const company = companies.find((item) => item.id === position?.companyId)
    return [company?.name, position?.title].filter(Boolean).join(' · ')
  }
  return <div className="page-content">
    <header className="page-heading"><div><p className="eyebrow">{currentCycle?.name}</p><h1>掌握这一周，推进每一步。</h1><p>聚焦当前招聘季的进展、临近日程和需要关注的流程。</p></div><Button disabled={readonly} onClick={() => setEventOpen(true)}><CalendarPlus size={17} />新增日程</Button></header>
    <div className="kpi-grid">{kpis.map(([label, value, Icon, tone]) => <article className={`kpi-card ${tone}`} key={label}><div><span>{label}</span><strong>{value}</strong></div><Icon size={21} /><small>{label === 'Offer' && stats.accepted ? `另有 ${stats.accepted} 个已接受` : '当前招聘季'}</small></article>)}</div>
    <div className="dashboard-grid">
      <section className="panel focus-panel"><header><div><p className="eyebrow">本周重点</p><h2>本周事项</h2></div><Badge tone="accent">{weekEvents.length} 项</Badge></header>
        {!weekEvents.length ? <EmptyState icon={<CalendarClock />} title="本周暂时空闲" description="安排测评、笔试或面试后，会统一显示在这里。" action={!readonly && <Button size="sm" variant="secondary" onClick={() => setEventOpen(true)}>新增日程</Button>} /> : <div className="timeline-list">{weekEvents.map((event) => <button key={event.id} onClick={() => setSelectedEvent(event)}><div className="date-block"><strong>{relativeDay(event.startAt)}</strong><span>{event.allDay ? '全天' : event.startAt?.slice(11, 16)}</span></div><div className="timeline-line"><span /></div><div className="grow"><strong>{event.title}</strong><p>{describe(event) || eventTypeLabels[event.type]}</p></div><Badge tone={event.completed ? 'success' : 'neutral'}>{event.completed ? '已完成' : eventTypeLabels[event.type]}</Badge></button>)}</div>}
      </section>
      <section className="panel attention-panel"><header><div><p className="eyebrow">需要关注</p><h2>需要关注</h2></div><AlertCircle size={20} /></header>
        {!hasAttention ? <div className="all-clear"><CheckCircle2 size={28} /><strong>暂无紧急事项</strong><p>没有 48 小时内日程，也没有超过 7 天未更新的活跃投递。</p></div> : <div className="attention-list">
          {attentionEvents.slice(0, 3).map((event) => <button key={`event-${event.id}`} onClick={() => setSelectedEvent(event)}><span className="attention-dot urgent" /><div><strong>{event.title}</strong><p>{event.type === 'deadline' ? '截止事项' : '临近日程'} · {relativeDay(event.startAt)} {event.allDay ? '全天' : event.startAt?.slice(11, 16)}</p></div><ArrowUpRight size={16} /></button>)}
          {stale.slice(0, Math.max(0, 6 - attentionEvents.length)).map((application) => { const position = positions.find((item) => item.id === application.positionId); const company = companies.find((item) => item.id === position?.companyId); return <Link key={`application-${application.id}`} to={`/applications/${application.id}`}><span className="attention-dot" /><div><strong>{company?.name} · {position?.title}</strong><p>{currentStage(application)?.name} · 已 {differenceInCalendarDays(today, parseISO(application.updatedAt))} 天未更新</p></div><ArrowUpRight size={16} /></Link> })}
        </div>}
      </section>
    </div>
    <CalendarPanel events={cycleEvents} onCreate={readonly ? undefined : (date) => { setInitialDate(date); setEventOpen(true) }} onSelect={setSelectedEvent} />
    <EventModal key={`${eventOpen}-${initialDate}`} open={eventOpen} initialDate={initialDate} onClose={() => { setEventOpen(false); setInitialDate(undefined) }} />
    <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(undefined)} />
  </div>
}
