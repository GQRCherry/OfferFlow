import { useRef, useState } from 'react'
import { AlertTriangle, DatabaseBackup, Download, FileJson, FileSpreadsheet, ShieldCheck, Upload } from 'lucide-react'
import { useApp } from '../../app/AppContext'
import { Button, Modal } from '../../components/ui'
import type { ExportBundle } from '../../types/domain'
import { clearOrdinaryData, exportApplicationsCSV, exportJSON, importBundle, importSummary, parseImportBundle } from './service'

export function DataPage() {
  const { currentCycleId, toast } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const [bundle, setBundle] = useState<ExportBundle>()
  const [summary, setSummary] = useState<Record<string, number>>()
  const readFile = async (file?: File) => {
    if (!file) return
    try { const parsed = parseImportBundle(await file.text()); setBundle(parsed); setSummary(importSummary(parsed)) } catch (error) { toast(error instanceof Error ? error.message : '导入文件无效', 'error') }
  }
  const applyImport = async (mode: 'merge' | 'replace') => {
    if (!bundle) return
    if (mode === 'replace' && !confirm('全量替换会清空当前普通业务数据。强烈建议先导出备份。确认继续？')) return
    try { await importBundle(bundle, mode); toast(mode === 'merge' ? '数据已合并导入' : '数据已全量恢复'); setBundle(undefined) } catch (error) { toast(error instanceof Error ? error.message : '导入失败', 'error') }
  }
  return <div className="page-content narrow-page">
    <header className="page-heading"><div><p className="eyebrow">DATA OWNERSHIP</p><h1>数据与备份</h1><p>所有业务数据都属于你。定期导出，避免浏览器清理数据导致丢失。</p></div></header>
    <div className="data-grid">
      <article className="data-card primary-data"><div className="data-icon"><DatabaseBackup /></div><div><p className="eyebrow">FULL BACKUP</p><h2>普通数据 JSON</h2><p>包含招聘季、公司、岗位、投递、流程历史、日程、面经和非敏感设置。</p><div className="safety-line"><ShieldCheck size={16} />不包含招聘官网密码、LLM API Key 或本地加密密钥</div></div><Button onClick={() => exportJSON().then(() => toast('备份文件已生成'))}><Download size={16} />导出 JSON</Button></article>
      <article className="data-card"><div className="data-icon"><FileSpreadsheet /></div><div><p className="eyebrow">SPREADSHEET</p><h2>投递列表 CSV</h2><p>导出当前招聘季的投递状态、流程大类、时间、地点和相关链接。</p></div><Button variant="secondary" onClick={() => exportApplicationsCSV(currentCycleId).then(() => toast('CSV 已生成'))}><Download size={16} />导出 CSV</Button></article>
      <article className="data-card"><div className="data-icon"><Upload /></div><div><p className="eyebrow">RESTORE</p><h2>导入备份</h2><p>文件会先完成格式和引用关系校验，再让你选择合并或全量替换。</p></div><input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(e) => readFile(e.target.files?.[0])} /><Button variant="secondary" onClick={() => inputRef.current?.click()}><FileJson size={16} />选择 JSON</Button></article>
    </div>
    <section className="danger-zone large-danger"><div><AlertTriangle size={20} /><div><strong>清空全部普通数据</strong><p>敏感数据将保留，但招聘季、岗位、投递、日程等会被清除。请先备份。</p></div></div><Button variant="danger" onClick={async () => { if (confirm('确认清空全部普通业务数据？该操作不可撤销。')) { await clearOrdinaryData(); toast('普通数据已清空') } }}>清空普通数据</Button></section>
    <Modal open={!!bundle} onClose={() => setBundle(undefined)} title="确认导入" subtitle={`备份导出于 ${bundle?.exportedAt?.replace('T', ' ').slice(0, 16) ?? ''}`}>
      <div className="import-summary">{summary && Object.entries(summary).map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
      <div className="notice"><ShieldCheck size={17} />导入包已通过结构校验。敏感数据不会由普通备份恢复。</div>
      <div className="modal-actions"><Button variant="ghost" onClick={() => setBundle(undefined)}>取消</Button><Button variant="secondary" onClick={() => applyImport('merge')}>合并导入</Button><Button variant="danger" onClick={() => applyImport('replace')}>全量替换</Button></div>
    </Modal>
  </div>
}
