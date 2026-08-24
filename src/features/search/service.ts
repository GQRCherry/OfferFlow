import type { Application, Company, Interview, Position, RecruitmentEvent } from '../../types/domain'

export type SearchResult = {
  id: string
  group: '公司' | '岗位' | '投递' | '面经' | '日程'
  title: string
  subtitle: string
  href: string
}

function haystack(parts: Array<string | undefined | string[]>) {
  return parts.flatMap((part) => Array.isArray(part) ? part : [part ?? '']).join(' ').toLocaleLowerCase()
}

export function searchCycleData(input: {
  query: string
  cycleId: string
  companies: Company[]
  positions: Position[]
  applications: Application[]
  interviews: Interview[]
  events: RecruitmentEvent[]
}): SearchResult[] {
  const query = input.query.trim().toLocaleLowerCase()
  if (!query) return []
  const cyclePositions = input.positions.filter((item) => item.cycleId === input.cycleId)
  const cycleApplications = input.applications.filter((item) => item.cycleId === input.cycleId)
  const companyIds = new Set(cyclePositions.map((item) => item.companyId))
  const results: SearchResult[] = []
  for (const company of input.companies.filter((item) => companyIds.has(item.id))) {
    if (haystack([company.name, company.notes]).includes(query)) results.push({ id: company.id, group: '公司', title: company.name, subtitle: '公司信息', href: `/positions?company=${company.id}` })
  }
  for (const position of cyclePositions) {
    const company = input.companies.find((item) => item.id === position.companyId)
    const jd = position.jdStructured
    if (haystack([position.title, position.department, position.locations, position.notes, jd?.title, jd?.department, jd?.locations, jd?.responsibilities, jd?.requirements, jd?.preferred, jd?.keywords, jd?.education, jd?.graduationRequirement, jd?.other]).includes(query)) results.push({ id: position.id, group: '岗位', title: position.title, subtitle: company?.name ?? '未知公司', href: `/positions?position=${position.id}` })
  }
  for (const application of cycleApplications) {
    const position = cyclePositions.find((item) => item.id === application.positionId)
    const company = input.companies.find((item) => item.id === position?.companyId)
    const stage = application.pipeline.find((item) => item.id === application.currentStageId)
    if (haystack([application.notes, position?.title, company?.name, stage?.name]).includes(query)) results.push({ id: application.id, group: '投递', title: `${company?.name ?? ''} · ${position?.title ?? '未知岗位'}`, subtitle: stage?.name ?? '', href: `/applications/${application.id}` })
  }
  for (const interview of input.interviews.filter((item) => item.cycleId === input.cycleId)) {
    const application = cycleApplications.find((item) => item.id === interview.applicationId)
    const position = cyclePositions.find((item) => item.id === application?.positionId)
    const company = input.companies.find((item) => item.id === position?.companyId)
    if (haystack([interview.stageNameSnapshot, interview.interviewer, interview.notes, interview.reflection]).includes(query)) results.push({ id: interview.id, group: '面经', title: `${company?.name ?? ''} · ${interview.stageNameSnapshot}`, subtitle: position?.title ?? '', href: `/interviews?interview=${interview.id}` })
  }
  for (const event of input.events.filter((item) => item.cycleId === input.cycleId)) {
    if (haystack([event.title, event.notes, event.location]).includes(query)) results.push({ id: event.id, group: '日程', title: event.title, subtitle: event.startAt ?? '未设置时间', href: event.applicationId ? `/applications/${event.applicationId}` : '/dashboard' })
  }
  return results.slice(0, 50)
}
