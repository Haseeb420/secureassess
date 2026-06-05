import type { AuthToken, Candidate } from '@secureassess/shared-types'
import { supabase } from '../../lib/supabase'
import { useAssessmentStore } from '../../store/assessmentStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

type AuthResult = AuthToken & { candidate: Candidate }

async function handleAuthResponse(res: Response): Promise<AuthResult> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail ?? `Request failed: ${res.status}`)
  }
  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    candidate: data.candidate,
  }
}

export async function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/candidate/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleAuthResponse(res)
}

export async function loginWithInviteToken(token: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/candidate/verify-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  return handleAuthResponse(res)
}

export async function loginWithAssessmentToken(tokenValue: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/candidate/login-with-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_value: tokenValue }),
  })
  return handleAuthResponse(res)
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
  useAssessmentStore.getState().clearAuth()
}

export function getCurrentSession(): AuthToken | null {
  const { authToken, candidate } = useAssessmentStore.getState()
  if (!authToken || !candidate) return null
  return { accessToken: authToken, refreshToken: '', expiresAt: 0 }
}
