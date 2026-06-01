'use client'

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { ChevronLeft, ChevronRight, FileQuestion } from 'lucide-react'
import { CodeEditor } from '../features/ide/CodeEditor'
import { ConsoleOutput, type ConsoleStatus } from '../features/ide/ConsoleOutput'
import { EditorToolbar } from '../features/ide/EditorToolbar'
import { QuestionPanel } from '../features/ide/QuestionPanel'
import { SubmissionModal } from '../features/ide/SubmissionModal'
import { ViolationBanner } from '../features/security/ViolationBanner'
import { useSecurityMonitor } from '../features/security/useSecurityMonitor'
import { TopBar } from '../components/TopBar'
import { useAutoSave } from '../features/persistence/useAutoSave'
import { useAssessmentStore } from '../store/assessmentStore'
import {
  runSampleTests,
  submitSolution,
  type RunResult,
  type SubmitResult,
} from '../features/ide/evaluationService'
import { defaultTemplates } from '../features/ide/templates'

export function AssessmentPage() {
  const navigate = useNavigate()
  const {
    candidate,
    assessmentId,
    sessionId,
    assessmentTitle,
    questions,
    currentQuestionIndex,
    currentLanguage,
    codeByLanguage,
    consoleOutput,
    timerSeconds,
    timerTotalSeconds,
    setLanguage,
    setCode,
    appendOutput,
    clearOutput,
    decrementTimer,
    setCurrentQuestionIndex,
  } = useAssessmentStore()

  const currentQuestion = questions[currentQuestionIndex] ?? null

  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState(14)
  const [runHistory, setRunHistory] = useState<RunResult[]>([])

  const { violationCount, lastViolation } = useSecurityMonitor({ enabled: true })

  // Reset run state when switching questions
  useEffect(() => {
    setRunResult(null)
    setCompileError(null)
    setRunHistory([])
    clearOutput()
  }, [currentQuestionIndex, clearOutput])

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
    if (!currentQuestion) return
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
        currentQuestion.sampleTests,
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

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion) return
    setIsSubmitting(true)
    appendOutput({ type: 'system', text: 'Submitting solution…' })

    try {
      const result = await submitSolution(
        sessionId ?? assessmentId ?? 'unknown-session',
        currentQuestion.id,
        currentLanguage,
        codeByLanguage[currentLanguage],
      )
      setSubmitResult(result)
    } catch (err) {
      appendOutput({ type: 'stderr', text: String(err) })
      appendOutput({ type: 'system', text: 'Submission failed.' })
    } finally {
      setIsSubmitting(false)
    }
  }, [assessmentId, currentQuestion, currentLanguage, codeByLanguage, appendOutput])

  const handleResetCode = useCallback(() => {
    setCode(currentLanguage, defaultTemplates[currentLanguage])
    setCompileError(null)
  }, [currentLanguage, setCode])

  useEffect(() => {
    const unlisten = listen('assessment:locked', () => {
      navigate('/completion', { replace: true })
    })
    return () => { unlisten.then((fn) => fn()) }
  }, [navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleRun()
      } else if (e.key === 's') {
        e.preventDefault()
        forceSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleRun, handleSubmit, forceSave])

  const handleFinish = useCallback(() => {
    navigate('/completion', { replace: true })
  }, [navigate])

  const consoleStatus: ConsoleStatus = isRunning || isSubmitting
    ? 'running'
    : runResult == null
      ? 'idle'
      : runResult.compile_error
        ? 'error'
        : runResult.outcomes.every((o) => o.passed)
          ? 'pass'
          : 'fail'

  // No questions loaded yet
  if (questions.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-brand-navy text-white/50">
        <FileQuestion size={36} className="mb-3 text-white/20" />
        <p className="text-sm">No questions loaded for this assessment.</p>
        <button
          onClick={() => navigate('/pre-assessment')}
          className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-xs hover:border-white/30 transition-colors"
        >
          ← Back
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ViolationBanner violation={lastViolation} violationCount={violationCount} />

      <TopBar
        candidateName={candidate?.name ?? candidate?.email ?? 'Candidate'}
        assessmentTitle={assessmentTitle ?? 'Assessment'}
        questionIndex={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        timerSeconds={timerSeconds}
        timerTotalSeconds={timerTotalSeconds}
        sessionId={assessmentId}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <div className="min-h-0 flex-1">
        <PanelGroup orientation="horizontal" className="h-full">
          <Panel defaultSize="38%" minSize="28%" maxSize="50%">
            {currentQuestion ? (
              <QuestionPanel question={currentQuestion} runHistory={runHistory} />
            ) : null}
          </Panel>

          <PanelResizeHandle className="w-1.5 cursor-col-resize bg-brand-border transition-colors hover:bg-brand-orange" />

          <Panel defaultSize="62%" minSize="50%">
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
          </Panel>
        </PanelGroup>
      </div>

      {/* Bottom status bar */}
      <div
        className="flex h-[22px] shrink-0 items-center gap-6 border-t border-white/10 bg-brand-navy px-4 text-xs font-mono text-white/40"
        aria-hidden="true"
      >
        <span>{isRunning || isSubmitting ? 'Running…' : 'Ready'}</span>
        <span>{currentLanguage}</span>

        {/* Question navigation */}
        {questions.length > 1 && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              aria-label="Previous question"
              className="flex items-center rounded p-0.5 hover:text-white/70 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="tabular-nums">
              Q{currentQuestionIndex + 1}/{questions.length}
            </span>
            <button
              onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
              aria-label="Next question"
              className="flex items-center rounded p-0.5 hover:text-white/70 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}

        {timerSeconds < 300 && (
          <span className="ml-auto text-brand-orange">
            {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')} remaining
          </span>
        )}
      </div>

      {submitResult && (
        <SubmissionModal result={submitResult} onFinish={handleFinish} />
      )}
    </div>
  )
}
