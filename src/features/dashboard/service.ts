import { currentStage } from '../../lib/utils'
import type { Application, Position } from '../../types/domain'

export function calculateDashboardStats(positions: Position[], applications: Application[]) {
  return {
    positions: positions.length,
    applied: applications.filter((application) => currentStage(application)?.category !== 'todo').length,
    pre: applications.filter((application) => currentStage(application)?.category === 'pre_interview' && application.result === 'active').length,
    interview: applications.filter((application) => currentStage(application)?.category === 'interview' && application.result === 'active').length,
    offer: applications.filter((application) => currentStage(application)?.category === 'offer' && application.result === 'active').length,
    accepted: applications.filter((application) => application.result === 'offer_accepted').length,
  }
}
