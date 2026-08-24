import { useMemo, useState } from 'react'
import { MessageSquareText, Pencil, Search, Trash2, UserRoundSearch } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { Badge, Button, EmptyState, IconButton, Input, Modal, Select } from '../../components/ui'
import { MarkdownView } from '../../components/Markdown'
import { formatDate } from '../../lib/utils'
import { INTERVIEW_RESULT_LABELS } from '../../lib/constants'
import type { Interview } from '../../types/domain'
import { InterviewModal } from './InterviewUI'
import { deleteInterview } from './service'

export function InterviewsPage() {
  const { currentCycle, cycleInterviews, cycleApplications, cyclePositions, companies, toast } = useApp()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [company, setCompany] = useState('')
  const [positionId, setPositionId] = useState('')
  const [stage, setStage] = useState('')
  const [result, setResult] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [edit, setEdit] = useState<Interview>()
  const selected = cycleInterviews.find((item) => item.id === params.get('interview'))
  const stageNames = [...new Set(cycleInterviews.map((item) => item.stageNameSnapshot))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const companyPositions = cyclePositions.filter((position) => !company || position.companyId === company)
  const rows = useMemo(() => cycleInterviews.filter((interview) => {
    const application = cycleApplications.find((item) => item.id === interview.applicationId)
    const position = cyclePositions.find((item) => item.id === application?.positionId)
    const owner = companies.find((item) => item.id === position?.companyId)
    const date = interview.createdAt.slice(0, 10)
    return (!query || `${owner?.name} ${position?.title} ${interview.stageNameSnapshot} ${interview.notes} ${interview.reflection}`.toLowerCase().includes(query.toLowerCase()))
      && (!company || owner?.id === company)
      && (!positionId || position?.id === positionId)
      && (!stage || interview.stageNameSnapshot === stage)
      && (!result || interview.result === result)
      && (!dateFrom || date >= dateFrom)
      && (!dateTo || date <= dateTo)
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [cycleInterviews, cycleApplications, cyclePositions, companies, query, company, positionId, stage, result, dateFrom, dateTo])
  const selectedApplication = cycleApplications.find((item) => item.id === (edit ?? selected)?.applicationId)
  const detailContext = (interview: Interview) => {
    const application = cycleApplications.find((item) => item.id === interview.applicationId)
    const position = cyclePositions.find((item) => item.id === application?.positionId)
    const owner = companies.find((item) => item.id === position?.companyId)
    return { application, position, owner }
  }
  return <div className="page-content">
    <header className="page-heading"><div><p className="eyebrow">面试记录</p><h1>面试与面经</h1><p>每一场面试独立记录，让复盘可以被搜索、回看和积累。</p></div></header>
    <div className="filter-bar interview-filters">
      <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索面试问题、复盘、公司或岗位" /></label>
      <Select aria-label="筛选公司" value={company} onChange={(event) => { setCompany(event.target.value); setPositionId('') }}><option value="">全部公司</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
      <Select aria-label="筛选岗位" value={positionId} onChange={(event) => setPositionId(event.target.value)}><option value="">全部岗位</option>{companyPositions.map((position) => <option key={position.id} value={position.id}>{position.title}</option>)}</Select>
      <Select aria-label="筛选面试轮次" value={stage} onChange={(event) => setStage(event.target.value)}><option value="">全部轮次</option>{stageNames.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
      <Select aria-label="筛选结果" value={result} onChange={(event) => setResult(event.target.value)}><option value="">全部结果</option><option value="pending">待定</option><option value="passed">通过</option><option value="failed">未通过</option><option value="unknown">未知</option></Select>
      <Input aria-label="面试开始日期" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
      <Input aria-label="面试结束日期" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
    </div>
    {!rows.length ? <EmptyState icon={<UserRoundSearch />} title="还没有面经" description="进入某条投递的详情页，为每一场面试单独记录面经。" /> : <div className="interview-library">{rows.map((interview) => {
      const { position, owner } = detailContext(interview)
      return <article key={interview.id} onClick={() => setParams({ interview: interview.id })}><header><div><span className="company-avatar">{owner?.name.slice(0, 1)}</span><div><strong>{owner?.name}</strong><p>{position?.title}</p></div></div><Badge tone={interview.result === 'passed' ? 'success' : interview.result === 'failed' ? 'danger' : 'neutral'}>{INTERVIEW_RESULT_LABELS[interview.result ?? 'pending']}</Badge></header><h2>{interview.stageNameSnapshot}</h2><p className="clamp-3">{interview.notes || '暂无面经正文'}</p><footer><span>{formatDate(interview.createdAt)}</span><span>{interview.durationMinutes ? `${interview.durationMinutes} 分钟` : '时长未记录'}</span></footer></article>
    })}</div>}
    <Modal wide open={!!selected && !edit} onClose={() => setParams({})} title={selected?.stageNameSnapshot ?? ''} subtitle={selected ? `${detailContext(selected).owner?.name} · ${detailContext(selected).position?.title}` : ''}>
      {selected && <div className="interview-detail"><div className="detail-toolbar"><div className="tag-row"><Badge>{formatDate(selected.createdAt)}</Badge>{selected.durationMinutes && <Badge>{selected.durationMinutes} 分钟</Badge>}{selected.interviewer && <Badge>{selected.interviewer}</Badge>}</div><div><Button disabled={currentCycle?.status === 'archived'} variant="secondary" onClick={() => setEdit(selected)}><Pencil size={15} />编辑</Button><IconButton disabled={currentCycle?.status === 'archived'} label="删除面经" onClick={async () => { if (confirm('确认删除这篇面经？')) { await deleteInterview(selected); toast('面经已删除'); setParams({}) } }}><Trash2 size={16} /></IconButton></div></div><section><h3>面经正文</h3><MarkdownView value={selected.notes} /></section><section className="reflection"><MessageSquareText size={18} /><div><h3>个人复盘</h3><MarkdownView value={selected.reflection} /></div></section></div>}
    </Modal>
    {edit && selectedApplication && <InterviewModal open application={selectedApplication} edit={edit} onClose={() => { setEdit(undefined); setParams({}) }} />}
  </div>
}
