import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen,
  CalendarX2,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  Tag,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@secureassess/ui'
import type { Assessment, AssessmentStatus } from '@secureassess/shared-types'
import { useAssessmentStore } from '../store/assessmentStore'
import { startMock } from '../features/attempt/mockAttemptService'
import { CountdownTimer } from '../components/CountdownTimer'

const SYNE   = { fontFamily: "'Syne', system-ui, sans-serif" } as const
const DMSANS = { fontFamily: "'DM Sans', system-ui, sans-serif" } as const
const DMMONO = { fontFamily: "'DM Mono', 'Courier New', monospace" } as const

function getInitials(name: string | undefined | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function formatDate(isoString: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    }).format(new Date(isoString))
  } catch {
    return isoString
  }
}

function questionTypeSummary(questions: Assessment['questions']): string {
  const list = questions ?? []
  const types = [...new Set(list.map((q) => q.question.type))].map((t) =>
    t === 'coding' ? 'Coding' : t === 'mcq' ? 'MCQ' : 'Written',
  )
  return `${list.length} question${list.length !== 1 ? 's' : ''}  ·  ${types.join(', ')}`
}

export function LandingPage() {
  const navigate = useNavigate()
  const landingData = useAssessmentStore((s) => s.landingData)!
  const { reset, setAssessmentData, setQuestions } = useAssessmentStore()

  const [assessmentStatus, setAssessmentStatus] = useState<AssessmentStatus>(
    landingData.assessmentStatus,
  )
  const [startingMockId, setStartingMockId] = useState<string | null>(null)

  const { token, assessment, mocks } = landingData
  // Guard against snake_case API responses (candidate_name vs candidateName)
  const candidateName =
    token.candidateName ??
    (token as unknown as Record<string, string>)['candidate_name'] ??
    token.candidateEmail ??
    'Candidate'
  const initials = getInitials(candidateName)
  const attemptsRemaining = token.usedCount < token.usageLimit

  const handleLogout = () => {
    reset()
    navigate('/login', { replace: true })
  }

  const handleBeginAssessment = () => {
    setAssessmentData(assessment.id, assessment.title, assessment.durationMins)
    // Questions will be populated from /attempts/start once the assessment begins.
    // Clear any stale questions from a previous session.
    setQuestions([])
    navigate('/pre-assessment')
  }

  const handleStartMock = async (mock: Assessment) => {
    if (startingMockId) return  // prevent double-click
    setStartingMockId(mock.id)
    try {
      setAssessmentData(mock.id, mock.title, mock.durationMins)
      // startMock sets isMock=true, mockAttemptId, and questions in the store
      await startMock(token.tokenValue, mock.id)
      navigate('/assessment')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start practice round')
    } finally {
      setStartingMockId(null)
    }
  }

  const typeBadge = {
    open: {
      text: 'Open Access',
      cls: 'bg-green-50 text-green-700 border border-green-100',
    },
    deadline: {
      text: 'Deadline Based',
      cls: 'bg-amber-50 text-amber-700 border border-amber-100',
    },
    window: {
      text: 'Time Window',
      cls: 'bg-blue-50 text-blue-700 border border-blue-100',
    },
  }[assessment.type]

  const cardBorder = {
    active:      'border-brand-orange',
    upcoming:    'border-blue-300',
    closed:      'border-brand-border',
    completed:   'border-brand-border',
    not_started: 'border-brand-border',
  }[assessmentStatus] ?? 'border-brand-border'

  const cardStrip = {
    active:      'bg-brand-orange',
    upcoming:    'bg-blue-400',
    closed:      'bg-brand-border',
    completed:   'bg-brand-border',
    not_started: 'bg-brand-border',
  }[assessmentStatus] ?? 'bg-brand-border'

  return (
    <div className="flex h-screen flex-col overflow-y-auto bg-brand-surface">

      {/* ── Top bar ── */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] bg-brand-navy px-6">
        <div className="flex items-center gap-2.5">
          <img
            src="/wamo-logo.webp"
            alt=""
            role="presentation"
            width={28}
            height={28}
            className="rounded-sm object-contain"
          />
          <span className="text-[15px] font-semibold text-white" style={SYNE}>
            SecureAssess
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-orange/20 text-[11px] font-bold text-white"
              style={SYNE}
            >
              {initials}
            </div>
            <span className="text-[13px] text-white/70" style={DMSANS}>
              {candidateName}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="flex items-center justify-center rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-8">

          {/* Welcome header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-orange"
              style={DMSANS}
            >
              WELCOME BACK
            </p>
            <h1 className="mt-1 text-2xl font-bold text-brand-navy" style={SYNE}>
              {candidateName}
            </h1>
            <p className="mt-1 text-sm text-brand-navy/60" style={DMSANS}>
              Your assessment is ready. Review the practice rounds below first.
            </p>
          </motion.div>

          {/* ─── Section 1: Mock Assessments ─── */}
          {mocks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <div className="mb-4 mt-8 flex items-center justify-between">
                <h2 className="text-base font-semibold text-brand-navy" style={SYNE}>
                  Practice Rounds
                </h2>
                <span className="text-xs text-brand-navy/50" style={DMSANS}>
                  Unlimited attempts
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {mocks.map((mock, i) => (
                  <motion.div
                    key={mock.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.08 + i * 0.06 }}
                    className="cursor-pointer rounded-2xl border border-brand-border bg-white p-5 shadow-sm transition-all hover:border-brand-navy/30 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-base font-semibold text-brand-navy" style={SYNE}>
                        {mock.title}
                      </span>
                      <span
                        className="ml-3 shrink-0 rounded-full bg-brand-navy-pale px-2 py-0.5 text-xs text-brand-navy"
                        style={DMMONO}
                      >
                        Practice
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-brand-navy/60" style={DMSANS}>
                      {questionTypeSummary(mock.questions)}
                    </p>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-brand-navy/40" style={DMSANS}>
                        No time limit  ·  Results not recorded
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartMock(mock)}
                        disabled={!!startingMockId}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-1.5 text-sm text-white transition-opacity hover:opacity-80 disabled:opacity-60 disabled:pointer-events-none"
                        style={DMSANS}
                      >
                        {startingMockId === mock.id ? (
                          <>
                            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                            Starting…
                          </>
                        ) : (
                          'Start Practice'
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── Section 2: My Assessment ─── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <div className="mb-4 mt-8 flex items-center justify-between">
              <h2 className="text-base font-semibold text-brand-navy" style={SYNE}>
                Your Assessment
              </h2>
              <span
                className={cn('rounded-full px-2.5 py-1 text-xs font-medium', typeBadge.cls)}
                style={DMSANS}
              >
                {typeBadge.text}
              </span>
            </div>

            {/* Assessment card */}
            <div className={cn('overflow-hidden rounded-2xl border-2 bg-white shadow-sm', cardBorder)}>
              {/* Colored strip */}
              <div className={cn('h-1 w-full', cardStrip)} />

              <div className="p-5">
                {/* Title */}
                <h3 className="text-lg font-bold text-brand-navy" style={SYNE}>
                  {assessment.title}
                </h3>

                {/* Meta row */}
                <div className="mt-2 flex flex-wrap gap-4">
                  <span
                    className="flex items-center gap-1.5 text-sm text-brand-navy/60"
                    style={DMSANS}
                  >
                    <BookOpen size={14} className="shrink-0 text-brand-navy/40" />
                    {assessment.questions?.length ?? 0} question{(assessment.questions?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span
                    className="flex items-center gap-1.5 text-sm text-brand-navy/60"
                    style={DMSANS}
                  >
                    <Clock size={14} className="shrink-0 text-brand-navy/40" />
                    {assessment.durationMins} minutes
                  </span>
                  {(assessment.questions?.length ?? 0) > 0 && (
                    <span
                      className="flex items-center gap-1.5 text-sm text-brand-navy/60"
                      style={DMSANS}
                    >
                      <Tag size={14} className="shrink-0 text-brand-navy/40" />
                      {[...new Set((assessment.questions ?? []).map((q) => q.question.type))]
                        .map((t) =>
                          t === 'coding' ? 'Coding' : t === 'mcq' ? 'MCQ' : 'Written',
                        )
                        .join(', ')}
                    </span>
                  )}
                </div>

                {/* Schedule info */}
                <div className="mt-3">
                  {assessment.type === 'open' && (
                    <p
                      className="flex items-center gap-1.5 text-sm text-brand-navy/60"
                      style={DMSANS}
                    >
                      <CheckCircle2 size={14} className="shrink-0 text-green-500" />
                      Available any time
                      {token.expiryAt
                        ? ` before ${formatDate(token.expiryAt, assessment.timezone)}`
                        : ''}
                    </p>
                  )}
                  {assessment.type === 'deadline' && assessment.deadlineAt && (
                    <p
                      className="flex items-center gap-1.5 text-sm text-brand-navy/60"
                      style={DMSANS}
                    >
                      <CalendarX2 size={14} className="shrink-0 text-amber-500" />
                      Submit before {formatDate(assessment.deadlineAt, assessment.timezone)}
                    </p>
                  )}
                  {assessment.type === 'window' &&
                    assessment.windowStart &&
                    assessment.windowEnd && (
                      <p
                        className="flex items-center gap-1.5 text-sm text-brand-navy/60"
                        style={DMSANS}
                      >
                        <Clock size={14} className="shrink-0 text-blue-500" />
                        Window: {formatDate(assessment.windowStart, assessment.timezone)} —{' '}
                        {formatDate(assessment.windowEnd, assessment.timezone)}
                      </p>
                    )}
                </div>

                {/* Attempts info */}
                <div className="mt-2">
                  <p className="text-xs text-brand-navy/40" style={DMMONO}>
                    Attempt {token.usedCount + 1} of {token.usageLimit}
                  </p>
                  {token.usedCount > 0 && (
                    <p className="mt-0.5 text-xs text-brand-navy/40" style={DMMONO}>
                      You have attempted this assessment before.
                    </p>
                  )}
                </div>

                {/* ── Active + attempts remaining ── */}
                {assessmentStatus === 'active' && attemptsRemaining && (
                  <button
                    type="button"
                    onClick={handleBeginAssessment}
                    className="mt-5 w-full rounded-xl bg-brand-orange py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={DMSANS}
                  >
                    Begin Assessment →
                  </button>
                )}

                {/* ── Active + no attempts remaining ── */}
                {assessmentStatus === 'active' && !attemptsRemaining && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <XCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-red-700" style={DMSANS}>
                        No Attempts Remaining
                      </p>
                      <p className="mt-0.5 text-xs text-red-600/70" style={DMSANS}>
                        You have used all available attempts for this assessment.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Upcoming: countdown ── */}
                {assessmentStatus === 'upcoming' && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-700" style={DMSANS}>
                      Assessment opens in:
                    </p>
                    <div className="mt-3">
                      <CountdownTimer
                        targetMs={landingData.countdownToMs ?? 0}
                        onExpired={() => setAssessmentStatus('active')}
                      />
                    </div>
                    <p className="mt-3 text-xs text-blue-600/70" style={DMSANS}>
                      You will be able to begin when the countdown reaches zero.
                    </p>
                  </div>
                )}

                {/* ── Closed / completed ── */}
                {(assessmentStatus === 'closed' || assessmentStatus === 'completed') && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-red-700" style={DMSANS}>
                        Assessment Closed
                      </p>
                      <p className="mt-0.5 text-xs text-red-600/70" style={DMSANS}>
                        {assessmentStatus === 'completed'
                          ? 'You have already completed this assessment.'
                          : assessment.type === 'deadline'
                          ? 'The submission deadline for this assessment has passed.'
                          : 'The assessment window has closed. No further access is available.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <div className="h-8" />
        </div>
      </div>
    </div>
  )
}
