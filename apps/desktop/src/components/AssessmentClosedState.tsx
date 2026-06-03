import { CalendarX2 } from 'lucide-react'

const MESSAGES: Record<string, string> = {
  deadline_passed:  'The submission deadline for this assessment has passed.',
  window_closed:    'The assessment window has closed. No further access is available.',
  no_attempts_left: 'You have used all available attempts for this assessment.',
}

interface Props {
  reason: 'deadline_passed' | 'window_closed' | 'no_attempts_left'
}

export function AssessmentClosedState({ reason }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-surface px-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-border bg-white p-10 shadow-sm text-center max-w-sm w-full">
        <CalendarX2 size={48} className="text-brand-navy/30" aria-hidden="true" />
        <h1 className="font-sans font-semibold text-xl text-brand-navy">Assessment Closed</h1>
        <p className="text-sm text-brand-navy/50 leading-relaxed">{MESSAGES[reason]}</p>
      </div>
    </div>
  )
}
