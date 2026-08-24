import { lazy, Suspense, useState } from 'react'
import { Button, Textarea } from './ui'

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'))

export function MarkdownView({ value, empty = '暂无内容' }: { value?: string; empty?: string }) {
  if (!value?.trim()) return <p className="muted">{empty}</p>
  return <Suspense fallback={<p className="muted">正在加载预览…</p>}><MarkdownRenderer value={value} /></Suspense>
}

export function MarkdownEditor({ value, onChange, rows = 8 }: { value: string; onChange: (value: string) => void; rows?: number }) {
  const [preview, setPreview] = useState(false)
  return <div className="markdown-editor">
    <div className="segmented compact"><Button type="button" variant={!preview ? 'secondary' : 'ghost'} size="sm" onClick={() => setPreview(false)}>编辑</Button><Button type="button" variant={preview ? 'secondary' : 'ghost'} size="sm" onClick={() => setPreview(true)}>预览</Button></div>
    {preview ? <div className="markdown-preview"><MarkdownView value={value} /></div> : <Textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} placeholder="支持 Markdown…" />}
  </div>
}
