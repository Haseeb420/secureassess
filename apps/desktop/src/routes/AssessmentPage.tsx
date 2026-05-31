import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import type { Question } from '@secureassess/shared-types'
import { CodeEditor } from '../features/ide/CodeEditor'
import { ConsoleOutput } from '../features/ide/ConsoleOutput'
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

const mockQuestion: Question = {
  id: 'q1',
  title: 'Two Sum',
  difficulty: 'easy',
  timeLimitMs: 2000,
  memoryLimitMb: 256,
  description: `Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers that add up to \`target\`.

You may assume that each input has exactly one solution, and you may not use the same element twice.

**Example:**
\`\`\`
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
\`\`\`

**Constraints:**
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- Only one valid answer exists.`,
  sampleTests: [
    { id: 't1', input: '4\n2 7 11 15\n9', expectedOutput: '0 1', isHidden: false },
    { id: 't2', input: '3\n3 2 4\n6', expectedOutput: '1 2', isHidden: false },
    { id: 't3', input: '2\n3 3\n6', expectedOutput: '0 1', isHidden: true },
  ],
}

export function AssessmentPage() {
  const navigate = useNavigate()
  const {
    candidate,
    assessmentId,
    currentLanguage,
    codeByLanguage,
    consoleOutput,
    timerSeconds,
    setLanguage,
    setCode,
    appendOutput,
    clearOutput,
    decrementTimer,
  } = useAssessmentStore()

  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState(14)
  const [runHistory, setRunHistory] = useState<RunResult[]>([])

  const { violationCount, lastViolation } = useSecurityMonitor({ enabled: true })

  // Decrement timer every second
  useState(() => {
    const id = setInterval(() => decrementTimer(), 1000)
    return () => clearInterval(id)
  })

  const { forceSave } = useAutoSave({
    sessionId: assessmentId,
    questionId: mockQuestion.id,
    language: currentLanguage,
    code: codeByLanguage[currentLanguage],
  })

  const handleSave = useCallback(() => {
    forceSave()
    appendOutput({ type: 'system', text: '— Saved —' })
  }, [forceSave, appendOutput])

  const handleRun = useCallback(async () => {
    setIsRunning(true)
    setRunResult(null)
    setCompileError(null)
    clearOutput()
    appendOutput({ type: 'system', text: 'Running sample tests…' })

    try {
      const result = await runSampleTests(
        mockQuestion.id,
        currentLanguage,
        codeByLanguage[currentLanguage],
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
  }, [currentLanguage, codeByLanguage, appendOutput, clearOutput])

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    appendOutput({ type: 'system', text: 'Submitting solution…' })

    try {
      const result = await submitSolution(
        assessmentId ?? 'unknown-session',
        mockQuestion.id,
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
  }, [assessmentId, currentLanguage, codeByLanguage, appendOutput])

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

  const consoleStatus = isRunning || isSubmitting
    ? 'running'
    : runResult == null
      ? 'idle'
      : runResult.compile_error
        ? 'error'
        : runResult.outcomes.every((o) => o.passed)
          ? 'success'
          : 'error'

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Violation banner — fixed above top bar */}
      <ViolationBanner violation={lastViolation} violationCount={violationCount} />

      <TopBar
        candidateName={candidate?.name ?? candidate?.email ?? 'Candidate'}
        assessmentTitle="Assessment"
        questionIndex={1}
        totalQuestions={1}
        timerSeconds={timerSeconds}
        timerTotalSeconds={3600}
        sessionId={assessmentId}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Main layout */}
      <div className="min-h-0 flex-1">
        <PanelGroup orientation="horizontal" className="h-full">
          <Panel defaultSize={38} minSize={28} maxSize={50}>
            <QuestionPanel
              question={mockQuestion}
              runHistory={runHistory}
            />
          </Panel>

          <PanelResizeHandle className="w-1.5 cursor-col-resize bg-brand-border transition-colors hover:bg-brand-orange" />

          <Panel defaultSize={62} minSize={50}>
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
                <Panel defaultSize={72} minSize={30}>
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

                <Panel defaultSize={28} minSize={15}>
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
        <span>
          {isRunning || isSubmitting ? 'Running…' : 'Ready'}
        </span>
        <span>{currentLanguage}</span>
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
