import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './AppContext'
import { Layout } from './Layout'
import { Onboarding } from '../features/cycles/CycleUI'

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ApplicationsPage = lazy(() => import('../features/applications/ApplicationsPage').then((module) => ({ default: module.ApplicationsPage })))
const ApplicationDetailPage = lazy(() => import('../features/applications/ApplicationDetailPage').then((module) => ({ default: module.ApplicationDetailPage })))
const PositionsPage = lazy(() => import('../features/positions/PositionsPage').then((module) => ({ default: module.PositionsPage })))
const InterviewsPage = lazy(() => import('../features/interviews/InterviewsPage').then((module) => ({ default: module.InterviewsPage })))
const DataPage = lazy(() => import('../features/data-transfer/DataPage').then((module) => ({ default: module.DataPage })))
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function LoadingPage() { return <div className="route-loading"><span /><p>正在加载本地数据…</p></div> }

export function App() {
  const { cycles } = useApp()
  if (!cycles.length) return <Onboarding />
  return <Layout><Suspense fallback={<LoadingPage />}><Routes><Route path="/dashboard" element={<DashboardPage />} /><Route path="/applications" element={<ApplicationsPage />} /><Route path="/applications/:id" element={<ApplicationDetailPage />} /><Route path="/positions" element={<PositionsPage />} /><Route path="/interviews" element={<InterviewsPage />} /><Route path="/data" element={<DataPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></Suspense></Layout>
}
