'use client'

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { AlertCircle, FileQuestion, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn, Badge, ConfirmDialog } from '@secureassess/ui'
import type { SubmitAnswerRequest } from '@secureassess/shared-types'
import { CodeEditor } from '../features/ide/CodeEditor'
import { ConsoleOutput, type ConsoleStatus } from '../features/ide/ConsoleOutput'
import { EditorToolbar } from '../features/ide/EditorToolbar'
import { MCQAnswerPanel } from '../features/ide/MCQAnswerPanel'
import { TextAnswerPanel } from '../features/ide/TextAnswerPanel'
import { QuestionPanel } from '../features/ide/QuestionPanel'
import { ViolationBanner } from '../features/security/ViolationBanner'
import { useSecurityMonitor } from '../features/security/useSecurityMonitor'
import { exitKioskMode } from '../features/security/securityService'
import { TopBar } from '../components/TopBar'
import { ExitAssessmentDialog } from '../components/ExitAssessmentDialog'
import { useAutoSave } from '../features/persistence/useAutoSave'
import { useAssessmentStore } from '../store/assessmentStore'
import {
  startAttempt,
  submitAnswer,
  completeAttempt,
} from '../features/attempt/attemptService'
import {
  runSampleTests,
  type RunResult,
} from '../features/ide/evaluationService'
import { defaultTemplates } from '../features/ide/templates'

const DMSANS: React.CSSProperties = { fontFamily: "'DM Sans', system-ui, sans-serif" }
const DMMONO: React.CSSProperties = { fontFamily: "'DM Mono', 'Courier New', monospace" }

const TYPE_BADGE_VARIANT = {
  coding: 'neutral',
  mcq:    'blue',
  text:   'warning',
} as const

export function AssessmentPage() {
  const navigate = useNavigate()
  const {
    candidate,
    assessmentId,
    sessionId,
    assessmentTitle,
    questions,
    currentQuestionIdx,
    currentLanguage,
    codeByLanguage,
    consoleOutput,
    timerSeconds,
    timerTotalSeconds,
    token,
    currentAttemptId,
    submittedQuestions,
    answers,
    setLanguage,
    setCode,
    appendOutput,
    clearOutput,
    decrementTimer,
    saveAnswer,
  } = useAssessmentStore()

  const currentQuestion = questions[currentQuestionIdx] ?? null

  const [isStarting, setIsStarting]             = useState(false)
  const [startError, setStartError]             = useState<string | null>(null)
  const [isRunning, setIsRunning]               = useState(false)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [runResult, setRunResult]               = useState<RunResult | null>(null)
  const [compileError, setCompileError]         = useState<string | null>(null)
  const [fontSize, setFontSize]                 = useState(14)
  const [runHistory, setRunHistory]             = useState<RunResult[]>([])
  const [exitDialogOpen, setExitDialogOpen]     = useState(false)
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)

  const { violationCount, lastViolation } = useSecurityMonitor({ enabled: true })

  // Start attempt on mount if not already started
  useEffect(() => {
    if (currentAttemptId || !token) return
    setIsStarting(true)
    startAttempt(token.tokenValue)
      .then(() => setIsStarting(false))
      .catch((err: unknown) => {
        setStartError(err instanceof Error ? err.message : 'Failed to start assessment')
        setIsStarting(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset run state when moving to a new question
  useEffect(() => {
    setRunResult(null)
    setCompileError(null)
    setRunHistory([])
    clearOutput()
  }, [currentQuestionIdx, clearOutput])

  // Global timer countdown
  useEffect(() => {
    const id = setInterval(() => decrementTimer(), 1000)
    return () => clearInterval(id)
  }, [decrementTimer])

  const { forceSave } = useAutoSave({
    sessionId: sessionId,
    questionId: currentQuestion?.id ?? null,
    language: currentLanguage,
    code: codeByLanguage[currentLanguage],
  })

  const handleSave = useCallback(() => {
    forceSave()
    appendOutput({ type: 'system', text: '— Saved —' })
  }, [forceSave, appendOutput])

  const handleRun = useCallback(async () => {
    if (!currentQuestion || currentQuestion.type !== 'coding') return
    setIsRunning(true)
    setRunResult(null)
    setCompileError(null)
    clearOutput()
    appendOutput({ type: 'system', text: 'Running sample tests…' })

    try {
      const result = await runSampleTests(
        currentQuestion.id,
        currentLanguage,
        codeByLanguage[currentLanguage],
        currentQuestion.sampleTests ?? [],
        currentQuestion.timeLimitMs,
        currentQuestion.memoryLimitMb,
      )
      setRunResult(result)
      setRunHistory((h) => [result, ...h].slice(0, 20))

      if (result.compile_error) {
        setCompileError(result.compile_error)
        appendOutput({ type: 'stderr', text: result.compile_error })
        appendOutput({ type: 'system', text: 'Compilation failed.' })
      } else {
        result.outcomes.forEach((o, i) => {
          if (o.stdout) appendOutput({ type: 'stdout', text: `[Test ${i + 1}] ${o.stdout}` })
          if (o.stderr) appendOutput({ type: 'stderr', text: `[Test ${i + 1}] ${o.stderr}` })
        })
        const passed = result.outcomes.filter((o) => o.passed).length
        const total = result.outcomes.length
        appendOutput({ type: 'system', text: `${passed}/${total} sample tests passed` })
      }
    } catch (err) {
      appendOutput({ type: 'stderr', text: String(err) })
      appendOutput({ type: 'system', text: 'Run failed.' })
    } finally {
      setIsRunning(false)
    }
  }, [currentQuestion, currentLanguage, codeByLanguage, appendOutput, clearOutput])

  const handleResetCode = useCallback(() => {
    setCode(currentLanguage, defaultTemplates[currentLanguage])
    setCompileError(null)
  }, [currentLanguage, setCode])

  // Determine if submit is allowed for the current question
  const canSubmit = (() => {
    if (!currentQuestion) return false
    if (currentQuestion.type === 'coding') return !!codeByLanguage[currentLanguage]?.trim()
    if (currentQuestion.type === 'mcq') return !!answers[currentQuestion.id]?.selectedOption
    if (currentQuestion.type === 'text') return !!(answers[currentQuestion.id]?.answerText?.trim())
    return false
  })()

  const handleSubmitAnswer = useCallback(async () => {
    if (!currentQuestion || !currentAttemptId) return
    setIsSubmittingAnswer(true)

    try {
      const req: SubmitAnswerRequest = {
        attemptId:    currentAttemptId,
        questionId:   currentQuestion.id,
        questionType: currentQuestion.type,
      }

      if (currentQuestion.type === 'coding') {
        req.sourceCode = codeByLanguage[currentLanguage]
        req.language = currentLanguage
        if (runResult) {
          req.testResults = runResult.outcomes.map((o) => ({
            testCaseId: o.test_case_id ?? '',
            passed:     o.passed,
            timeMsec:   o.execution_time_ms,
            memoryMb:   0,
          }))
        }
      } else if (currentQuestion.type === 'mcq') {
        req.selectedOption = answers[currentQuestion.id]?.selectedOption
      } else if (currentQuestion.type === 'text') {
        req.answerText = answers[currentQuestion.id]?.answerText
      }

      const response = await submitAnswer(req)

      if (!response.nextQuestionAvailable) {
        // Last question submitted — complete the attempt
        try {
          await completeAttempt(currentAttemptId)
        } catch (completeErr) {
          toast.error(completeErr instanceof Error ? completeErr.message : 'Failed to finalize assessment')
        }
        await exitKioskMode().catch(() => {})
        navigate('/completion', { replace: true })
      }
      // advanceQuestion() is called inside submitAnswer service on accepted=true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit answer. Please try again.', {
        action: { label: 'Retry', onClick: () => handleSubmitAnswer() },
      })
    } finally {
      setIsSubmittingAnswer(false)
    }
  }, [
    currentQuestion, currentAttemptId, currentLanguage,
    codeByLanguage, answers, runResult, navigate,
  ])

  // Navigate to completion when assessment is locked server-side
  useEffect(() => {
    const unlisten = listen('assessment:locked', () => {
      navigate('/completion', { replace: true })
    })
    return () => { unlisten.then((fn) => fn()) }
  }, [navigate])

  // Open exit dialog when native window close is requested during assessment
  useEffect(() => {
    const unlisten = listen('window:close-requested', () => {
      setExitDialogOpen(true)
    })
    return () => { unlisten.then((fn) => fn()) }
  }, [])

  // Keyboard shortcuts (coding only)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 'Enter') {
        e.preventDefault()
        handleRun()
      } else if (e.key === 's') {
        e.preventDefault()
        forceSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleRun, forceSave])

  const handleExitWithoutSubmit = useCallback(async () => {
    await exitKioskMode()
    navigate('/login', { replace: true })
  }, [navigate])

  // Build progress dots for TopBar
  const progressItems = questions.map((q, i) => ({
    submitted: submittedQuestions.has(q.id),
    current:   i === currentQuestionIdx,
  }))

  const consoleStatus: ConsoleStatus = isRunning
    ? 'running'
    : runResult == null
      ? 'idle'
      : runResult.compile_error
        ? 'error'
        : runResult.outcomes.every((o) => o.passed)
          ? 'pass'
          : 'fail'

  // ── Loading state ────────────────────────────────────────────────────────────

  if (isStarting) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-brand-navy">
        <Loader2 size={28} className="animate-spin text-brand-orange" aria-hidden="true" />
        <p className="mt-3 font-dm-sans text-sm text-white/50" style={DMSANS}>
          Starting assessment…
        </p>
      </div>
    )
  }

  if (startError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-brand-navy px-4">
        <AlertCircle size={32} className="text-red-400 mb-3" aria-hidden="true" />
        <p className="font-dm-sans text-sm text-white/70 text-center max-w-xs" style={DMSANS}>
          {startError}
        </p>
        <button
          onClick={() => { setStartError(null); setIsStarting(true); startAttempt(token!.tokenValue).then(() => setIsStarting(false)).catch((e: unknown) => { setStartError(e instanceof Error ? e.message : 'Failed'); setIsStarting(false) }) }}
          className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-xs text-white/60 hover:border-white/30 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-brand-navy text-white/50">
        <FileQuestion size={36} className="mb-3 text-white/20" />
        <p className="font-dm-sans text-sm" style={DMSANS}>No questions loaded for this assessment.</p>
        <button
          onClick={() => navigate('/pre-assessment')}
          className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-xs hover:border-white/30 transition-colors"
        >
          ← Back
        </button>
      </div>
    )
  }

  // ── Assessment UI ────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ViolationBanner violation={lastViolation} violationCount={violationCount} />

      <TopBar
        candidateName={candidate?.name ?? candidate?.email ?? 'Candidate'}
        assessmentTitle={assessmentTitle ?? 'Assessment'}
        questionIndex={currentQuestionIdx + 1}
        totalQuestions={questions.length}
        timerSeconds={timerSeconds}
        timerTotalSeconds={timerTotalSeconds}
        sessionId={assessmentId}
        onSubmit={() => {}}
        onExitClick={() => setExitDialogOpen(true)}
        isExitLocked={isRunning || isSubmittingAnswer}
        isExitDialogOpen={exitDialogOpen}
        sequentialMode
        progressItems={progressItems}
        hideSubmitButton
      />

      <div className="min-h-0 flex-1">
        <PanelGroup orientation="horizontal" className="h-full">
          {/* Left: question description */}
          <Panel defaultSize="38%" minSize="28%" maxSize="50%">
            {currentQuestion && (
              <QuestionPanel question={currentQuestion} runHistory={runHistory} />
            )}
          </Panel>

          <PanelResizeHandle className="w-1.5 cursor-col-resize bg-brand-border transition-colors hover:bg-brand-orange" />

          {/* Right: answer area */}
          <Panel defaultSize="62%" minSize="50%">
            {currentQuestion?.type === 'coding' ? (
              <div className="flex h-full flex-col">
                <EditorToolbar
                  language={currentLanguage}
                  onLanguageChange={setLanguage}
                  onRun={handleRun}
                  onSave={handleSave}
                  onResetCode={handleResetCode}
                  isRunning={isRunning}
                  fontSize={fontSize}
                  onFontSizeChange={setFontSize}
                />

                <PanelGroup orientation="vertical" className="min-h-0 flex-1">
                  <Panel defaultSize="72%" minSize="30%">
                    <CodeEditor
                      language={currentLanguage}
                      value={codeByLanguage[currentLanguage]}
                      onChange={(val) => {
                        setCode(currentLanguage, val)
                        setCompileError(null)
                      }}
                      onSave={handleSave}
                      compileError={compileError}
                      fontSize={fontSize}
                    />
                  </Panel>

                  <PanelResizeHandle className="h-1.5 cursor-row-resize bg-brand-border transition-colors hover:bg-brand-orange" />

                  <Panel defaultSize="28%" minSize="15%">
                    <ConsoleOutput
                      lines={consoleOutput}
                      status={consoleStatus}
                      onClear={clearOutput}
                    />
                  </Panel>
                </PanelGroup>
              </div>
            ) : currentQuestion?.type === 'mcq' ? (
              <MCQAnswerPanel
                question={currentQuestion}
                selectedOption={answers[currentQuestion.id]?.selectedOption}
                onSelect={(optionId) =>
                  saveAnswer(currentQuestion.id, {
                    selectedOption: optionId,
                    questionType: 'mcq',
                  } as never)
                }
              />
            ) : currentQuestion?.type === 'text' ? (
              <TextAnswerPanel
                question={currentQuestion}
                answerText={answers[currentQuestion.id]?.answerText ?? ''}
                onChange={(text) =>
                  saveAnswer(currentQuestion.id, {
                    answerText: text,
                    questionType: 'text',
                  } as never)
                }
              />
            ) : null}
          </Panel>
        </PanelGroup>
      </div>

      {/* Bottom submit bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-t border-brand-border bg-brand-surface px-6">
        {/* Left: type badge + weightage */}
        <div className="flex items-center">
          {currentQuestion && (
            <>
              <Badge
                variant={TYPE_BADGE_VARIANT[currentQuestion.type] ?? 'neutral'}
                className="font-dm-mono"
              >
                {currentQuestion.type === 'coding' ? 'Coding' : currentQuestion.type === 'mcq' ? 'MCQ' : 'Written'}
              </Badge>
              <span
                className="ml-3 text-xs text-brand-navy/40"
                style={DMMONO}
              >
                Worth {currentQuestion.weightage}%
              </span>
            </>
          )}
        </div>

        {/* Right: auto-save indicator + submit button */}
        <div className="flex items-center gap-3">
          {currentQuestion?.type === 'coding' && (
            <span className="text-xs text-brand-navy/40" style={DMSANS}>
              Auto-save on
            </span>
          )}

          <button
            type="button"
            disabled={!canSubmit || isSubmittingAnswer}
            onClick={() => setConfirmSubmitOpen(true)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-6 py-2 text-sm font-medium transition-all',
              canSubmit && !isSubmittingAnswer
                ? 'bg-brand-navy text-white hover:bg-brand-navy/90'
                : 'bg-brand-navy/20 text-brand-navy/30 cursor-not-allowed',
            )}
            style={DMSANS}
          >
            {isSubmittingAnswer ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              'Submit Answer →'
            )}
          </button>
        </div>
      </div>

      {/* Submit confirmation dialog */}
      <ConfirmDialog
        open={confirmSubmitOpen}
        title="Submit this answer?"
        description="You cannot change your answer after submitting."
        confirmLabel="Submit"
        cancelLabel="Go back"
        variant="primary"
        onConfirm={() => { setConfirmSubmitOpen(false); handleSubmitAnswer() }}
        onCancel={() => setConfirmSubmitOpen(false)}
      />

      <ExitAssessmentDialog
        open={exitDialogOpen}
        onClose={() => setExitDialogOpen(false)}
        onSubmitAndExit={async () => {
          await exitKioskMode()
          navigate('/completion', { replace: true })
        }}
        onExitWithoutSubmit={handleExitWithoutSubmit}
        questionsCompleted={submittedQuestions.size}
        questionsTotal={questions.length}
        isAssessmentCompleted={submittedQuestions.size === questions.length}
      />
    </div>
  )
}
