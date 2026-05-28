import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import type { Question } from '@secureassess/shared-types'
import { CodeEditor } from '../features/ide/CodeEditor'
import { ConsoleOutput } from '../features/ide/ConsoleOutput'
import { EditorToolbar } from '../features/ide/EditorToolbar'
import { QuestionPanel } from '../features/ide/QuestionPanel'
import { SubmissionModal } from '../features/ide/SubmissionModal'
import { TestRunner } from '../features/ide/TestRunner'
import { TopBar } from '../components/TopBar'
import { useAutoSave } from '../features/persistence/useAutoSave'
import { useAssessmentStore } from '../store/assessmentStore'
import {
  runSampleTests,
  submitSolution,
  type RunResult,
  type SubmitResult,
} from '../features/ide/evaluationService'

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
        appendOutput({
          type: 'system',
          text: `${passed}/${total} sample tests passed`,
        })
      }
    } catch (err) {
      appendOutput({ type: 'stderr', text: String(err) })
      appendOutput({ type: 'system', text: 'Run failed.' })
    } finally {
      setIsRunning(false)
    }
  }, [currentLanguage, codeByLanguage, appendOutput, clearOutput])

  const handleSubmit = useCallback(async () => {
    if (!window.confirm('Submit your solution? This cannot be undone.')) return

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

  // Navigate to completion when the Rust layer locks the assessment
  useEffect(() => {
    const unlisten = listen('assessment:locked', () => {
      navigate('/completion', { replace: true })
    })
    return () => { unlisten.then((fn) => fn()) }
  }, [navigate])

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
    <div className="flex h-screen flex-col bg-zinc-950">
      <TopBar
        candidateName={candidate?.name ?? candidate?.email ?? 'Candidate'}
        questionIndex={1}
        totalQuestions={1}
        timerSeconds={timerSeconds}
        sessionId={assessmentId}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <div className="min-h-0 flex-1">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel defaultSize={35} minSize={25}>
            <QuestionPanel question={mockQuestion} />
          </Panel>

          <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-zinc-600 transition-colors cursor-col-resize" />

          <Panel defaultSize={65} minSize={40}>
            <div className="flex h-full flex-col">
              <EditorToolbar
                language={currentLanguage}
                onLanguageChange={setLanguage}
                onRun={handleRun}
                onSave={handleSave}
                isRunning={isRunning}
              />

              <PanelGroup direction="vertical" className="min-h-0 flex-1">
                <Panel defaultSize={65} minSize={30}>
                  <CodeEditor
                    language={currentLanguage}
                    value={codeByLanguage[currentLanguage]}
                    onChange={(val) => {
                      setCode(currentLanguage, val)
                      setCompileError(null)
                    }}
                    onSave={handleSave}
                    compileError={compileError}
                  />
                </Panel>

                <PanelResizeHandle className="h-1 bg-zinc-800 hover:bg-zinc-600 transition-colors cursor-row-resize" />

                <Panel defaultSize={35} minSize={15}>
                  <PanelGroup direction="horizontal" className="h-full">
                    <Panel defaultSize={60}>
                      <ConsoleOutput
                        lines={consoleOutput}
                        status={consoleStatus}
                        onClear={clearOutput}
                      />
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-zinc-600 transition-colors cursor-col-resize" />

                    <Panel defaultSize={40} minSize={25}>
                      <TestRunner
                        onRun={handleRun}
                        result={runResult}
                        isRunning={isRunning}
                      />
                    </Panel>
                  </PanelGroup>
                </Panel>
              </PanelGroup>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {submitResult && (
        <SubmissionModal result={submitResult} onFinish={handleFinish} />
      )}
    </div>
  )
}
