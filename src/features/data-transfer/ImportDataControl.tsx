import { useRef, useState } from 'react'
import { FileJson, ShieldCheck, Upload } from 'lucide-react'
import { useApp } from '../../app/AppContext'
import { Button, Modal } from '../../components/ui'
import type { ExportBundle } from '../../types/domain'
import { importBundle, importSummary, parseImportBundle } from './service'

export function ImportDataControl({ label = '导入备份', variant = 'secondary', onImported }: { label?: string; variant?: 'primary' | 'secondary' | 'ghost'; onImported?: () => void }) {
  const { toast } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const [bundle, setBundle] = useState<ExportBundle>()
  const [summary, setSummary] = useState<Record<string, number>>()

  const readFile = async (file?: File) => {
    if (!file) return
    try {
      const parsed = parseImportBundle(await file.text())
      setBundle(parsed)
      setSummary(importSummary(parsed))
    } catch (error) {
      toast(error instanceof Error ? error.message : '导入文件无效', 'error')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const applyImport = async (mode: 'merge' | 'replace') => {
    if (!bundle) return
    if (mode === 'replace' && !confirm('全量替换会清空当前普通业务数据。强烈建议先导出备份。确认继续？')) return
    try {
      await importBundle(bundle, mode)
      toast(mode === 'merge' ? '数据已合并导入' : '数据已全量恢复')
      setBundle(undefined)
      onImported?.()
    } catch (error) {
      toast(error instanceof Error ? error.message : '导入失败', 'error')
    }
  }

  return <>
    <input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => readFile(event.target.files?.[0])} />
    <Button variant={variant} onClick={() => inputRef.current?.click()}><Upload size={16} />{label}</Button>
    <Modal open={!!bundle} onClose={() => setBundle(undefined)} title="确认导入" subtitle={`备份导出于 ${bundle?.exportedAt?.replace('T', ' ').slice(0, 16) ?? ''}`}>
      <div className="import-summary">{summary && Object.entries(summary).map(([itemLabel, count]) => <div key={itemLabel}><span>{itemLabel}</span><strong>{count}</strong></div>)}</div>
      <div className="notice"><ShieldCheck size={17} />导入包已通过结构校验。敏感数据不会由普通备份恢复。</div>
      <div className="modal-actions"><Button variant="ghost" onClick={() => setBundle(undefined)}>取消</Button><Button variant="secondary" onClick={() => applyImport('merge')}>合并导入</Button><Button variant="danger" onClick={() => applyImport('replace')}><FileJson size={15} />全量替换</Button></div>
    </Modal>
  </>
}
