import { useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { useAssessmentStore } from '../store/assessmentStore'

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const itemVariants: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function AnimatedCheck() {
  const [draw, setDraw] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDraw(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <style>{`
        .check-path {
          stroke-dasharray: 80;
          stroke-dashoffset: 80;
          animation: draw-check 600ms ease forwards;
        }
        @keyframes draw-check { to { stroke-dashoffset: 0; } }
      `}</style>
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true">
        <circle cx="44" cy="44" r="42" stroke="rgba(42,42,71,0.10)" strokeWidth="2" />
        <path
          d="M 26 44 L 38 56 L 62 32"
          stroke="#DE5E1F"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className={draw ? 'check-path' : ''}
        />
      </svg>
    </>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 1) return `${s}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function CompletionPage() {
  const { timerSeconds, timerTotalSeconds, questions, finalScore } = useAssessmentStore()
  const elapsed = timerTotalSeconds - timerSeconds

  useEffect(() => {
    window.history.pushState(null, '', '/completion')
    const handlePop = () => window.history.pushState(null, '', '/completion')
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  const scoreColor =
    finalScore === null ? 'text-brand-navy'
    : finalScore >= 70  ? 'text-green-600'
    : finalScore >= 50  ? 'text-brand-orange'
    : 'text-red-500'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-surface px-4">
      <motion.div
        className="flex w-full max-w-sm flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 1. Logo + brand name */}
        <motion.div variants={itemVariants} className="mb-8 flex items-center gap-2">
          <ShieldCheck size={20} className="text-brand-navy/30" aria-hidden="true" />
          <span className="font-dm-sans text-sm text-brand-navy/40">SecureAssess</span>
        </motion.div>

        {/* 2. Animated checkmark */}
        <motion.div variants={itemVariants}>
          <AnimatedCheck />
        </motion.div>

        {/* 3. Title */}
        <motion.h1
          variants={itemVariants}
          className="mt-6 font-syne text-2xl font-bold text-brand-navy"
        >
          Assessment Complete
        </motion.h1>

        {/* 4. Score card */}
        <motion.div
          variants={itemVariants}
          className="mx-auto mt-6 w-full max-w-xs rounded-2xl border border-brand-border bg-white p-6"
        >
          <p className="font-dm-sans text-xs uppercase tracking-[0.12em] text-brand-navy/50">
            YOUR SCORE
          </p>
          <p className={`mt-2 font-syne text-5xl font-bold ${scoreColor}`}>
            {finalScore !== null ? `${finalScore.toFixed(1)}%` : '—'}
          </p>
          <p className="mt-2 font-dm-sans text-xs text-brand-navy/40 text-center">
            Your detailed results will be reviewed by the assessment team.
          </p>
        </motion.div>

        {/* 5. Stats pills */}
        <motion.div variants={itemVariants} className="mt-4 flex gap-3 justify-center">
          <div className="rounded-full border border-brand-border bg-white px-4 py-1.5">
            <span className="font-dm-mono text-xs text-brand-navy/60">
              Questions&nbsp;&nbsp;{questions.length}
            </span>
          </div>
          <div className="rounded-full border border-brand-border bg-white px-4 py-1.5">
            <span className="font-dm-mono text-xs text-brand-navy/60">
              Duration&nbsp;&nbsp;{formatDuration(elapsed)}
            </span>
          </div>
        </motion.div>

        {/* 6. Close note */}
        <motion.p
          variants={itemVariants}
          className="mt-8 font-dm-sans text-xs text-brand-navy/30 text-center"
        >
          You may close this window.
        </motion.p>
      </motion.div>
    </div>
  )
}
