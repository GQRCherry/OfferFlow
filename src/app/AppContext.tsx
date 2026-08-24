import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { settingsRepo } from '../db/repositories'
import type { Theme } from '../types/domain'

export function useAppData() {
  const cycles = useLiveQuery(() => db.recruitmentCycles.orderBy('createdAt').reverse().toArray(), [], [])
  const companies = useLiveQuery(() => db.companies.orderBy('name').toArray(), [], [])
  const positions = useLiveQuery(() => db.positions.toArray(), [], [])
  const applications = useLiveQuery(() => db.applications.toArray(), [], [])
  const events = useLiveQuery(() => db.events.toArray(), [], [])
  const interviews = useLiveQuery(() => db.interviews.toArray(), [], [])
  const histories = useLiveQuery(() => db.applicationStageHistory.toArray(), [], [])
  const accounts = useLiveQuery(() => db.careerAccounts.toArray(), [], [])
  const providers = useLiveQuery(() => db.llmProviderConfigs.toArray(), [], [])
  const currentCycleSetting = useLiveQuery(() => db.settings.get('currentCycleId'))
  const currentCycleId = typeof currentCycleSetting?.value === 'string' ? currentCycleSetting.value : cycles.find((cycle) => cycle.status === 'active')?.id
  const currentCycle = cycles.find((cycle) => cycle.id === currentCycleId)
  const cyclePositions = positions.filter((item) => item.cycleId === currentCycleId)
  const cycleApplications = applications.filter((item) => item.cycleId === currentCycleId)
  const cycleEvents = events.filter((item) => item.cycleId === currentCycleId)
  const cycleInterviews = interviews.filter((item) => item.cycleId === currentCycleId)
  return { cycles, companies, positions, applications, events, interviews, histories, accounts, providers, currentCycleId, currentCycle, cyclePositions, cycleApplications, cycleEvents, cycleInterviews }
}

type AppData = ReturnType<typeof useAppData>
type ToastTone = 'success' | 'error' | 'info'
type UIContextValue = AppData & {
  setCurrentCycleId: (id: string) => Promise<void>
  theme: Theme
  setTheme: (theme: Theme) => Promise<void>
  toast: (message: string, tone?: ToastTone) => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const data = useAppData()
  const themeSetting = useLiveQuery(() => db.settings.get('theme'))
  const theme = ((themeSetting?.value as Theme | undefined) ?? 'system')
  const [toastState, setToastState] = useState<{ message: string; tone: ToastTone } | null>(null)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      root.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const value = useMemo<UIContextValue>(() => ({
    ...data,
    theme,
    setCurrentCycleId: async (id) => settingsRepo.set('currentCycleId', id),
    setTheme: async (next) => settingsRepo.set('theme', next),
    toast: (message, tone = 'success') => {
      setToastState({ message, tone })
      window.setTimeout(() => setToastState(null), 2600)
    },
  }), [data, theme])

  return (
    <UIContext.Provider value={value}>
      {children}
      {toastState && <div className={`toast toast-${toastState.tone}`} role="status">{toastState.message}</div>}
    </UIContext.Provider>
  )
}

export function useApp() {
  const context = useContext(UIContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
