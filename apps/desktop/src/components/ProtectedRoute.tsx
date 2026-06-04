import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { useAssessmentStore } from '../store/assessmentStore'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const landingData = useAssessmentStore((s) => s.landingData)
  // Allow through if authenticated via email/password OR via invite token
  if (!isAuthenticated && !landingData) return <Navigate to="/login" replace />
  return <Outlet />
}
