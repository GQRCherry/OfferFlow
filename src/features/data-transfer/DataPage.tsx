import { AlertTriangle, DatabaseBackup, Download, FileSpreadsheet, ShieldCheck, Upload } from 'lucide-react'
import { useApp } from '../../app/AppContext'
import { Button } from '../../components/ui'
import { clearOrdinaryData, exportApplicationsCSV, exportJSON } from './service'
import { ImportDataControl } from './ImportDataControl'

export function DataPage() {
  const { currentCycleId, toast } = useApp()
  return <div className="page-content narrow-page">
    <header className="page-heading"><div><p className="eyebrow">数据归你所有</p><h1>数据与备份</h1><p>所有业务数据都属于你。定期导出，避免浏览器清理数据导致丢失。</p></div></header>
    <div className="data-grid">
      <article className="data-card primary-data"><div className="data-icon"><DatabaseBackup /></div><div><p className="eyebrow">完整备份</p><h2>普通数据 JSON</h2><p>包含招聘季、公司、岗位、投递、流程历史、日程、面经和非敏感设置。</p><div className="safety-line"><ShieldCheck size={16} />不包含招聘官网密码、LLM API Key 或本地加密密钥</div></div><Button onClick={() => exportJSON().then(() => toast('备份文件已生成'))}><Download size={16} />导出 JSON</Button></article>
      <article className="data-card"><div className="data-icon"><FileSpreadsheet /></div><div><p className="eyebrow">表格导出</p><h2>投递列表 CSV</h2><p>导出当前招聘季的投递状态、流程大类、时间、地点和相关链接。</p></div><Button variant="secondary" onClick={() => exportApplicationsCSV(currentCycleId).then(() => toast('CSV 已生成'))}><Download size={16} />导出 CSV</Button></article>
      <article className="data-card"><div className="data-icon"><Upload /></div><div><p className="eyebrow">数据恢复</p><h2>导入备份</h2><p>文件会先完成格式和引用关系校验，再让你选择合并或全量替换。</p></div><ImportDataControl label="选择 JSON" /></article>
    </div>
    <section className="danger-zone large-danger"><div><AlertTriangle size={20} /><div><strong>清空全部普通数据</strong><p>敏感数据将保留，但招聘季、岗位、投递、日程等会被清除。请先备份。</p></div></div><Button variant="danger" onClick={async () => { if (confirm('确认清空全部普通业务数据？该操作不可撤销。')) { await clearOrdinaryData(); toast('普通数据已清空') } }}>清空普通数据</Button></section>
  </div>
}
