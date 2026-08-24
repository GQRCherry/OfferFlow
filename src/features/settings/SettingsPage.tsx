import { useEffect, useState, type FormEvent } from 'react'
import { Bot, CheckCircle2, Eye, EyeOff, KeyRound, Moon, Palette, ShieldAlert, Sun, Trash2 } from 'lucide-react'
import { useApp } from '../../app/AppContext'
import { Badge, Button, Field, Input, Select } from '../../components/ui'
import { SILICONFLOW_PRESET } from '../../lib/constants'
import { clearAllSecrets, readLLMSecret } from '../../security/secrets'
import type { Theme } from '../../types/domain'
import { testConnection } from '../ai/service'
import { saveProviderConfig } from '../ai/configService'

export function SettingsPage() {
  const { theme, setTheme, cycles, currentCycleId, setCurrentCycleId, providers, toast } = useApp()
  const provider = providers.find((item) => item.isDefault) ?? providers[0]
  const [form, setForm] = useState({ name: provider?.name ?? SILICONFLOW_PRESET.name, baseUrl: provider?.baseUrl ?? SILICONFLOW_PRESET.baseUrl, model: provider?.model ?? SILICONFLOW_PRESET.model, apiKey: '', storage: 'local' as 'local' | 'session' })
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  useEffect(() => {
    if (!provider) return
    setForm((value) => ({ ...value, name: provider.name, baseUrl: provider.baseUrl, model: provider.model }))
    readLLMSecret(provider.id).then((secret) => setForm((value) => ({ ...value, apiKey: secret?.apiKey ?? '' }))).catch(() => undefined)
  }, [provider])
  const saveProvider = async (event: FormEvent) => {
    event.preventDefault()
    await saveProviderConfig(form, provider)
    toast('AI 服务商配置已保存')
  }
  const runTest = async () => {
    if (!provider) return toast('请先保存 AI 服务商配置', 'info')
    setTesting(true)
    const result = await testConnection(provider)
    toast(result.message ?? (result.ok ? '连接成功' : '连接失败'), result.ok ? 'success' : 'error')
    setTesting(false)
  }
  return <div className="page-content narrow-page">
    <header className="page-heading"><div><p className="eyebrow">偏好设置</p><h1>设置</h1><p>主题、默认招聘季、AI 服务商与敏感数据管理。</p></div></header>
    <section className="settings-section panel"><header><div className="settings-icon"><Palette /></div><div><h2>常规设置</h2><p>外观与当前工作区</p></div></header><div className="settings-body"><Field label="主题"><div className="theme-options">{([['system', '跟随系统', Palette], ['light', '浅色', Sun], ['dark', '深色', Moon]] as const).map(([value, label, Icon]) => <button key={value} className={theme === value ? 'active' : ''} onClick={() => setTheme(value as Theme)}><Icon size={18} /><span>{label}</span>{theme === value && <CheckCircle2 size={16} />}</button>)}</div></Field><Field label="默认招聘季"><Select value={currentCycleId ?? ''} onChange={(e) => setCurrentCycleId(e.target.value)}>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}{cycle.status === 'archived' ? '（已归档）' : ''}</option>)}</Select></Field></div></section>
    <section className="settings-section panel"><header><div className="settings-icon purple"><Bot /></div><div><h2>AI · JD 提纯</h2><p>兼容 OpenAI 接口的 AI 服务商；仅在你主动点击时发送 JD 原文。</p></div>{provider && <Badge tone="success">已配置</Badge>}</header><form className="settings-body form-stack" onSubmit={saveProvider}><div className="form-grid"><Field label="服务商名称"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="模型"><Input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field></div><Field label="Base URL"><Input required type="url" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} /></Field><Field label="API Key" hint="生产密钥不会写入构建产物或普通 JSON 导出。"><div className="password-input"><Input required type={showKey ? 'text' : 'password'} value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} autoComplete="off" /><button type="button" aria-label={showKey ? '隐藏 API Key' : '显示 API Key'} onClick={() => setShowKey((value) => !value)}>{showKey ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field><Field label="保存方式"><Select value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value as 'local' | 'session' })}><option value="local">加密保存到本地敏感数据区</option><option value="session">仅本次会话</option></Select></Field><div className="notice warning"><ShieldAlert size={18} /><span>调用模型前，当前 JD 原文会发送至你配置的第三方模型服务。请确认其隐私政策。</span></div><div className="settings-actions"><Button type="button" variant="secondary" disabled={testing || !provider} onClick={runTest}>{testing ? '测试中…' : '测试连接'}</Button><Button>保存配置</Button></div></form></section>
    <section className="settings-section panel"><header><div className="settings-icon red"><KeyRound /></div><div><h2>敏感数据</h2><p>招聘官网账号密码与 LLM API Key 独立于普通业务数据。</p></div></header><div className="settings-body"><div className="security-copy"><p>无主密码模式主要用于降低普通数据泄露时的明文暴露风险。若攻击者已控制当前浏览器、系统账户或应用执行环境，则无法保证敏感信息安全。</p></div><Button variant="danger" onClick={async () => { if (confirm('确认清空全部敏感数据？招聘官网账号密码和 LLM API Key 都会永久删除。')) { await clearAllSecrets(); setForm((value) => ({ ...value, apiKey: '' })); toast('敏感数据已清空') } }}><Trash2 size={16} />清空全部敏感数据</Button></div></section>
  </div>
}
