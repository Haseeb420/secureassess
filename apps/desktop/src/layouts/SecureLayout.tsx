import { Outlet } from 'react-router-dom'

export function SecureLayout() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Outlet />
    </div>
  )
}
