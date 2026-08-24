import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Application, Company, PipelineStage, Position } from '../types/domain'

export const nowIso = () => new Date().toISOString()
export const uid = () => crypto.randomUUID()

export function currentStage(application: Application): PipelineStage | undefined {
  return application.pipeline.find((stage) => stage.id === application.currentStageId)
}

export function formatDate(value?: string, fallback = '未设置'): string {
  if (!value) return fallback
  try {
    return format(parseISO(value), 'yyyy-MM-dd', { locale: zhCN })
  } catch {
    return value
  }
}

export function formatDateTime(value?: string, fallback = '未设置'): string {
  if (!value) return fallback
  try {
    return format(parseISO(value), 'MM-dd HH:mm', { locale: zhCN })
  } catch {
    return value
  }
}

export function relativeDay(value?: string): string {
  if (!value) return ''
  const date = parseISO(value)
  if (isToday(date)) return '今天'
  if (isTomorrow(date)) return '明天'
  return format(date, 'M月d日', { locale: zhCN })
}

export function companyForPosition(position: Position | undefined, companies: Company[]): Company | undefined {
  return position ? companies.find((company) => company.id === position.companyId) : undefined
}

export function positionForApplication(application: Application, positions: Position[]): Position | undefined {
  return positions.find((position) => position.id === application.positionId)
}

export function safeExternalUrl(value?: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}
