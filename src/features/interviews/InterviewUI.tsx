import { useState, type FormEvent } from 'react'
import { useApp } from '../../app/AppContext'
import { Button, Field, Input, Modal, Select } from '../../components/ui'
import { MarkdownEditor } from '../../components/Markdown'
import { db } from '../../db/schema'
import { currentStage, nowIso, uid } from '../../lib/utils'
import type { Application, Interview } from '../../types/domain'

export function InterviewModal({ open, onClose, application, edit }: { open: boolean; onClose: () => void; application: Application; edit?: Interview }) {
  const { cycleEvents, toast } = useApp()
  const stage = currentStage(application)
  const [form, setForm] = useState({ eventId: edit?.eventId ?? '', stageId: edit?.stageId ?? stage?.id ?? '', stageName: edit?.stageNameSnapshot ?? stage?.name ?? '面试', interviewer: edit?.interviewer ?? '', durationMinutes: edit?.durationMinutes?.toString() ?? '', result: edit?.result ?? 'pending', notes: edit?.notes ?? '', reflection: edit?.reflection ?? '' })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const timestamp = nowIso()
    await db.interviews.put({ id: edit?.id ?? uid(), cycleId: application.cycleId, applicationId: application.id, eventId: form.eventId || undefined, stageId: form.stageId || undefined, stageNameSnapshot: form.stageName.trim() || '面试', interviewer: form.interviewer || undefined, durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined, result: form.result as Interview['result'], notes: form.notes || undefined, reflection: form.reflection || undefined, createdAt: edit?.createdAt ?? timestamp, updatedAt: timestamp })
    toast(edit ? '面经已更新' : '面经已记录')
    onClose()
  }
  const interviewEvents = cycleEvents.filter((item) => item.applicationId === application.id && ['interview', 'hr_interview'].includes(item.type))
  return <Modal wide open={open} onClose={onClose} title={edit ? '编辑面经' : '记录一场面试'} subtitle="每一场面试独立保存，流程后续改名不会影响当前快照。">
    <form className="form-stack" onSubmit={submit}>
      <div className="form-grid"><Field label="面试轮次"><Input required value={form.stageName} onChange={(e) => setForm({ ...form, stageName: e.target.value })} /></Field><Field label="关联日程"><Select value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })}><option value="">不关联</option>{interviewEvents.map((item) => <option key={item.id} value={item.id}>{item.startAt?.slice(0, 16).replace('T', ' ')} · {item.title}</option>)}</Select></Field></div>
      <div className="form-grid three"><Field label="面试官"><Input value={form.interviewer} onChange={(e) => setForm({ ...form, interviewer: e.target.value })} /></Field><Field label="时长（分钟）"><Input type="number" min="0" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} /></Field><Field label="结果"><Select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as NonNullable<Interview['result']> })}><option value="pending">待定</option><option value="passed">通过</option><option value="failed">未通过</option><option value="unknown">未知</option></Select></Field></div>
      <Field label="面经正文"><MarkdownEditor value={form.notes} onChange={(notes) => setForm({ ...form, notes })} rows={10} /></Field>
      <Field label="个人复盘"><MarkdownEditor value={form.reflection} onChange={(reflection) => setForm({ ...form, reflection })} rows={6} /></Field>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button>保存面经</Button></div>
    </form>
  </Modal>
}
