import { useEffect, useMemo, useState } from 'react'
import { Building2, CalendarClock, FileText, Search, Send, UserRoundSearch } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { searchCycleData } from './service'

const icons = { 公司: Building2, 岗位: FileText, 投递: Send, 面经: UserRoundSearch, 日程: CalendarClock }

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchCycleData({ query, cycleId: app.currentCycleId ?? '', companies: app.companies, positions: app.positions, applications: app.applications, interviews: app.interviews, events: app.events }), [query, app.currentCycleId, app.companies, app.positions, app.applications, app.interviews, app.events])
  useEffect(() => { if (!open) setQuery('') }, [open])
  if (!open) return null
  const grouped = results.reduce<Record<string, typeof results>>((acc, item) => { (acc[item.group] ??= []).push(item); return acc }, {})
  return <div className="command-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="command-palette" role="dialog" aria-modal="true" aria-label="全局搜索">
      <div className="command-input"><Search size={20} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公司、岗位、JD、面经和日程…" /><kbd>ESC</kbd></div>
      <div className="command-results">
        {!query && <div className="command-placeholder">输入关键词开始搜索。敏感信息和 JD 原文不会进入索引。</div>}
        {query && !results.length && <div className="command-placeholder">没有找到匹配结果</div>}
        {Object.entries(grouped).map(([group, items]) => <div className="command-group" key={group}><span>{group}</span>{items?.map((item) => { const Icon = icons[item.group]; return <button key={`${item.group}-${item.id}`} onClick={() => { navigate(item.href); onClose() }}><Icon size={17} /><div><strong>{item.title}</strong><small>{item.subtitle}</small></div></button> })}</div>)}
      </div>
    </section>
  </div>
}
