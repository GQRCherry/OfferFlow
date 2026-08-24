import { useEffect, useState, type FormEvent } from 'react'
import { Archive, CalendarRange, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { archiveCycle, createCycle, deleteCycleCascade, restoreCycle, updateCycle } from '../../db/repositories'
import { useApp } from '../../app/AppContext'
import { Button, Field, IconButton, Input, Modal, Select } from '../../components/ui'
import type { RecruitmentCycle } from '../../types/domain'
import { MarkdownEditor } from '../../components/Markdown'

const initial = { name: '', type: 'autumn' as NonNullable<RecruitmentCycle['type']>, startDate: '', endDate: '', notes: '' }

export function CycleModal({ open, onClose, edit }: { open: boolean; onClose: () => void; edit?: RecruitmentCycle }) {
  const { toast } = useApp()
  const [form, setForm] = useState(initial)
  useEffect(() => setForm(edit ? { name: edit.name, type: edit.type ?? 'other', startDate: edit.startDate ?? '', endDate: edit.endDate ?? '', notes: edit.notes ?? '' } : initial), [edit, open])
  const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (edit) await updateCycle(edit.id, form)
      else await createCycle(form)
      setForm(initial)
      toast(edit ? '招聘季已更新' : '招聘季已创建')
      onClose()
    } catch (error) { toast(error instanceof Error ? error.message : '创建失败', 'error') } finally { setSaving(false) }
  }
  return <Modal open={open} onClose={onClose} title={edit ? "编辑招聘季" : "新建招聘季"} subtitle="岗位、投递和日程将按招聘季隔离。">
    <form className="form-stack" onSubmit={submit}>
      <Field label="招聘季名称"><Input autoFocus required placeholder="例如：2027 春招" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="类型"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as NonNullable<RecruitmentCycle['type']> })}><option value="autumn">秋招</option><option value="spring">春招</option><option value="summer_intern">暑期实习</option><option value="daily_intern">日常实习</option><option value="other">其他</option></Select></Field>
      <div className="form-grid"><Field label="开始日期"><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field><Field label="结束日期"><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field></div>
      <Field label="备注"><MarkdownEditor value={form.notes} onChange={(notes) => setForm({ ...form, notes })} rows={5} /></Field>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button disabled={saving}>{saving ? '保存中…' : edit ? '保存招聘季' : '创建招聘季'}</Button></div>
    </form>
  </Modal>
}

export function Onboarding() {
  const [open, setOpen] = useState(false)
  return <main className="onboarding-shell">
    <section className="onboarding-card">
      <div className="brand-mark large"><span>O</span></div>
      <p className="eyebrow">本地优先的求职工作台</p>
      <h1>把招聘季，变成一条清晰的路径。</h1>
      <p>岗位、投递、流程、日程和面经都保存在你的浏览器本地。先创建一个招聘季，开始建立自己的求职工作台。</p>
      <Button onClick={() => setOpen(true)}><Plus size={17} /> 创建第一个招聘季</Button>
      <div className="privacy-note">无需注册 · 无云数据库 · 普通数据可随时导出</div>
    </section>
    <CycleModal open={open} onClose={() => setOpen(false)} />
  </main>
}

export function CycleManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cycles, currentCycleId, setCurrentCycleId, positions, applications, toast } = useApp()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<RecruitmentCycle>()
  return <>
    <Modal open={open} onClose={onClose} title="招聘季管理" subtitle="归档招聘季默认以只读方式保留，随时可以恢复。">
      <div className="list-stack">
        {cycles.map((cycle) => <div className="manage-row" key={cycle.id}>
          <div className="manage-row-icon"><CalendarRange size={18} /></div>
          <div className="grow"><strong>{cycle.name}</strong><p>{cycle.status === 'active' ? '进行中' : '已归档'}{cycle.id === currentCycleId ? ' · 当前查看' : ''}</p></div>
          {cycle.id !== currentCycleId && <Button size="sm" variant="secondary" onClick={async () => { await setCurrentCycleId(cycle.id); toast(`已切换至 ${cycle.name}`) }}>查看</Button>}
          <IconButton label={cycle.status === 'archived' ? '请先恢复招聘季再编辑' : '编辑招聘季'} disabled={cycle.status === 'archived'} onClick={() => setEditing(cycle)}><Pencil size={15} /></IconButton>
          {cycle.status === 'active' ? <Button size="sm" variant="ghost" onClick={async () => { await archiveCycle(cycle.id); toast('已归档') }}><Archive size={15} />归档</Button> : <Button size="sm" variant="ghost" onClick={async () => { await restoreCycle(cycle.id); toast('已恢复') }}><RotateCcw size={15} />恢复</Button>}
          <IconButton label="删除招聘季" onClick={async () => { const positionCount = positions.filter((item) => item.cycleId === cycle.id).length; const applicationCount = applications.filter((item) => item.cycleId === cycle.id).length; if (confirm(`确认删除“${cycle.name}”？将同时删除 ${positionCount} 个岗位、${applicationCount} 条投递及其 History、Event 和 Interview。建议优先归档。`)) { await deleteCycleCascade(cycle.id); toast('招聘季已删除') } }}><Trash2 size={15} /></IconButton>
        </div>)}
      </div>
      <div className="modal-actions"><Button variant="secondary" onClick={() => setCreating(true)}><Plus size={16} />新建招聘季</Button></div>
    </Modal>
    <CycleModal open={creating} onClose={() => setCreating(false)} />
    <CycleModal open={!!editing} edit={editing} onClose={() => setEditing(undefined)} />
  </>
}
