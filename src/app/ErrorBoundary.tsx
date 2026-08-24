import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '../components/ui'

type State = { error?: Error }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {}
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error.name, info.componentStack)
  }
  render() {
    if (!this.state.error) return this.props.children
    const indexedDBError = this.state.error.name.includes('Dexie') || this.state.error.message.toLowerCase().includes('indexeddb')
    return <main className="fatal-state"><section><div className="fatal-icon"><AlertTriangle /></div><p className="eyebrow">LOCAL STORAGE ERROR</p><h1>{indexedDBError ? '当前环境无法使用 IndexedDB' : 'OfferFlow 暂时无法启动'}</h1><p>{indexedDBError ? 'OfferFlow 不会假装保存成功。请使用支持 IndexedDB 的现代浏览器，并确认没有禁用站点存储或处于受限浏览环境。' : this.state.error.message}</p><Button onClick={() => location.reload()}><RefreshCw size={16} />重新加载</Button></section></main>
  }
}
