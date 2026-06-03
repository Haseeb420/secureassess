import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { CrashRecoveryModal } from './components/CrashRecoveryModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LandingProtectedRoute } from './components/LandingProtectedRoute'
import { PageWrapper } from './components/PageWrapper'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SecureLayout } from './layouts/SecureLayout'
import { useCrashRecovery } from './features/persistence/useCrashRecovery'
import { LandingPage } from './routes/LandingPage'
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
        <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
        <Route element={<LandingProtectedRoute />}>
          <Route path="/landing" element={<PageWrapper><LandingPage /></PageWrapper>} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/pre-assessment" element={<PageWrapper><PreAssessmentPage /></PageWrapper>} />
          <Route
            path="/assessment"
            element={
              <ErrorBoundary>
                <PageWrapper>
                  <SecureLayout />
                </PageWrapper>
              </ErrorBoundary>
            }
          >
            <Route index element={<AssessmentPage />} />
          </Route>
          <Route path="/completion" element={<PageWrapper><CompletionPage /></PageWrapper>} />
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
