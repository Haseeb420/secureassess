import { useState } from 'react'
import type { Candidate } from '@secureassess/shared-types'
import { useAssessmentStore } from '../../store/assessmentStore'
import * as authService from './authService'

interface UseAuthReturn {
  candidate: Candidate | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  loginWithToken: (token: string) => Promise<void>
  logout: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const { candidate, authToken, setCandidateData, setAuthToken } = useAssessmentStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResult = (result: Awaited<ReturnType<typeof authService.loginWithEmail>>) => {
    setCandidateData(result.candidate)
    setAuthToken(result.accessToken)
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await authService.loginWithEmail(email, password)
      handleResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithToken = async (token: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await authService.loginWithInviteToken(token)
      handleResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Token verification failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await authService.logout()
  }

  return {
    candidate,
    isAuthenticated: !!authToken && !!candidate,
    isLoading,
    error,
    login,
    loginWithToken,
    logout,
  }
}
