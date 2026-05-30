import { useEffect } from 'react'

export function CompletionPage() {
  useEffect(() => {
    window.history.pushState(null, '', '/completion')
    const handlePop = () => window.history.pushState(null, '', '/completion')
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-surface">
      <div className="rounded-xl border border-brand-border bg-white shadow-sm p-12 text-center max-w-sm mx-4">
        <div className="text-6xl text-brand-orange">✓</div>
        <h1 className="mt-4 text-2xl font-semibold text-brand-navy">Assessment Submitted</h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-navy/60">
          Your answers have been recorded. You may close this window.
        </p>
      </div>
    </div>
  )
}
