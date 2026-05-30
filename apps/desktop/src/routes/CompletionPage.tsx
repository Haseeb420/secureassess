import { useEffect } from 'react'

export function CompletionPage() {
  // Block back navigation — push the completion entry on every popstate
  useEffect(() => {
    window.history.pushState(null, '', '/completion')
    const handlePop = () => window.history.pushState(null, '', '/completion')
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-navy-dark">
      <div className="text-center">
        <div className="mb-6 text-7xl text-brand-orange">✓</div>
        <h1 className="mb-3 text-3xl font-semibold text-white">Assessment Submitted</h1>
        <p className="text-white/60">
          Your answers have been recorded. You may close this window.
        </p>
      </div>
    </div>
  )
}
