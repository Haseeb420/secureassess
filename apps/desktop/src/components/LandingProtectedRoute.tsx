import { Navigate, Outlet } from 'react-router-dom'
import { useAssessmentStore } from '../store/assessmentStore'

export function LandingProtectedRoute() {
  const landingData = useAssessmentStore((s) => s.landingData)
  if (!landingData) return <Navigate to="/login" replace />
  return <Outlet />
}
