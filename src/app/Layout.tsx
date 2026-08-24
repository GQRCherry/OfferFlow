import { useEffect, useState, type ReactNode } from 'react'
import { Archive, BriefcaseBusiness, CalendarDays, ChevronDown, FileSearch, LayoutDashboard, Menu, Moon, Search, Settings, Sun, UsersRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useApp } from './AppContext'
import { IconButton } from '../components/ui'
import { CycleManager } from '../features/cycles/CycleUI'
import { SearchModal } from '../features/search/SearchModal'

const nav = [
  { to: '/dashboard', label: '总览', icon: LayoutDashboard },
  { to: '/applications', label: '投递', icon: BriefcaseBusiness },
  { to: '/positions', label: '岗位库', icon: FileSearch },
  { to: '/interviews', label: '面经', icon: UsersRound },
  { to: '/data', label: '数据', icon: Archive },
  { to: '/settings', label: '设置', icon: Settings },
]

export function Layout({ children }: { children: ReactNode }) {
  const { currentCycle, theme, setTheme } = useApp()
  const [cycleOpen, setCycleOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true) }
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><span>O</span></div><div><strong>OfferFlow</strong><small>Job hunt, in order.</small></div></div>
      <button className="cycle-switcher" onClick={() => setCycleOpen(true)}><CalendarDays size={17} /><span><small>当前招聘季</small><strong>{currentCycle?.name ?? '未选择'}</strong></span><ChevronDown size={16} /></button>
      <nav>{nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileNav(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><button className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={17} /><span>全局搜索</span><kbd>⌘ K</kbd></button><p>数据仅保存在此浏览器</p></div>
    </aside>
    <div className="main-shell">
      <header className="mobile-header"><IconButton label="打开导航" onClick={() => setMobileNav((value) => !value)}><Menu size={20} /></IconButton><strong>OfferFlow</strong><IconButton label="切换主题" onClick={() => setTheme(nextTheme)}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</IconButton></header>
      <header className="desktop-topbar"><div><span className="status-dot" />本地数据已就绪</div><div className="topbar-actions"><button onClick={() => setSearchOpen(true)}><Search size={16} />搜索 <kbd>⌘ K</kbd></button><IconButton label="切换主题" onClick={() => setTheme(nextTheme)}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</IconButton></div></header>
      <main className="page-shell">{children}</main>
    </div>
    <CycleManager open={cycleOpen} onClose={() => setCycleOpen(false)} />
    <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
  </div>
}
