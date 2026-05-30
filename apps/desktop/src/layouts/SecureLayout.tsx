import { Outlet } from 'react-router-dom'

export function SecureLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <Outlet />
    </div>
  )
}
