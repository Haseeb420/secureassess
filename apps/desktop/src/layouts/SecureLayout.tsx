import { Outlet } from 'react-router-dom'
import { OfflineBanner } from '../components/OfflineBanner'

export function SecureLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <OfflineBanner />
      <Outlet />
    </div>
  )
}
