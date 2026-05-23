import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { CrashRecoveryModal } from './components/CrashRecoveryModal'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SecureLayout } from './layouts/SecureLayout'
import { useCrashRecovery } from './features/persistence/useCrashRecovery'
import { LoginPage } from './routes/LoginPage'
import { PreAssessmentPage } from './routes/PreAssessmentPage'
import { AssessmentPage } from './routes/AssessmentPage'
import { CompletionPage } from './routes/CompletionPage'

function AppContent() {
  const { showRecoveryModal, activeSession, confirmResume, confirmAbandon } = useCrashRecovery()

  return (
    <>
      {showRecoveryModal && activeSession && (
        <CrashRecoveryModal
          session={activeSession}
          onResume={confirmResume}
          onAbandon={confirmAbandon}
        />
      )}
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/pre-assessment" element={<PreAssessmentPage />} />
          <Route path="/assessment" element={<SecureLayout />}>
            <Route index element={<AssessmentPage />} />
          </Route>
          <Route path="/completion" element={<CompletionPage />} />
        </Route>
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <AppContent />
      </AppShell>
    </BrowserRouter>
  )
}

export default App
