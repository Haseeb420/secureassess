export interface Candidate {
  id: string
  email: string
  name: string
  organizationId: string
}

export interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'proctor'
}

export interface AuthToken {
  accessToken: string
  refreshToken: string
  expiresAt: number // unix timestamp
}

export interface AssessmentInvite {
  token: string
  assessmentId: string
  candidateEmail: string
  expiresAt: number
}
