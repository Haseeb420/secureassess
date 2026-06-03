import type { Assessment, AssessmentStatus } from '@secureassess/shared-types'

export function getAssessmentStatus(assessment: Assessment): {
  status: AssessmentStatus
  countdownMs?: number
  closedReason?: 'deadline_passed' | 'window_closed'
} {
  const now = new Date()

  if (assessment.type === 'open') {
    return { status: 'active' }
  }

  if (assessment.type === 'deadline') {
    const deadline = new Date(assessment.deadlineAt!)
    if (now > deadline) return { status: 'closed', closedReason: 'deadline_passed' }
    return { status: 'active' }
  }

  if (assessment.type === 'window') {
    const start = new Date(assessment.windowStart!)
    const end   = new Date(assessment.windowEnd!)
    if (now < start) {
      return { status: 'upcoming', countdownMs: start.getTime() - now.getTime() }
    }
    if (now >= start && now <= end) return { status: 'active' }
    return { status: 'closed', closedReason: 'window_closed' }
  }

  return { status: 'active' }
}
