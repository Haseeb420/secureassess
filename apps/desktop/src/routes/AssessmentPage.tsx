import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import type { ExecutionResult, Question } from '@secureassess/shared-types'
import { CodeEditor } from '../features/ide/CodeEditor'
import { ConsoleOutput } from '../features/ide/ConsoleOutput'
import { EditorToolbar } from '../features/ide/EditorToolbar'
import { QuestionPanel } from '../features/ide/QuestionPanel'
import { TestRunner } from '../features/ide/TestRunner'
import { TopBar } from '../components/TopBar'
import { useAutoSave } from '../features/persistence/useAutoSave'
import { useAssessmentStore } from '../store/assessmentStore'

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
    {
      id: 't1',
      input: '4\n2 7 11 15\n9',
      expectedOutput: '0 1',
      isHidden: false,
    },
    {
      id: 't2',
      input: '3\n3 2 4\n6',
      expectedOutput: '1 2',
      isHidden: false,
    },
    {
      id: 't3',
      input: '2\n3 3\n6',
      expectedOutput: '0 1',
      isHidden: true,
    },
  ],
}

const MOCK_RESULTS: ExecutionResult[] = [
  {
    testCaseId: 't1',
    passed: true,
    stdout: '0 1',
    stderr: '',
    executionTimeMs: 45,
    memoryUsedMb: 12,
    status: 'accepted',
  },
  {
    testCaseId: 't2',
    passed: false,
    stdout: '',
    stderr: '',
    executionTimeMs: 42,
    memoryUsedMb: 12,
    status: 'wrong_answer',
  },
]

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
  const [testResults, setTestResults] = useState<ExecutionResult[]>([])

  // Decrement timer every second
  useState(() => {
    const id = setInterval(() => decrementTimer(), 1000)
    return () => clearInterval(id)
  })

  // Auto-save current code (debounce 3s + periodic 30s)
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

  const handleRun = useCallback(async (): Promise<ExecutionResult[]> => {
    setIsRunning(true)
    clearOutput()
    appendOutput({ type: 'system', text: 'Running tests…' })
    await new Promise((r) => setTimeout(r, 1200))
    const results = MOCK_RESULTS
    setTestResults(results)
    results.forEach((r) => {
      if (r.stdout) appendOutput({ type: 'stdout', text: r.stdout })
      if (r.stderr) appendOutput({ type: 'stderr', text: r.stderr })
    })
    appendOutput({
      type: 'system',
      text: `${results.filter((r) => r.passed).length}/${results.length} tests passed`,
    })
    setIsRunning(false)
    return results
  }, [appendOutput, clearOutput])

  const handleSubmit = useCallback(() => {
    navigate('/completion')
  }, [navigate])

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <TopBar
        candidateName={candidate?.name ?? candidate?.email ?? 'Candidate'}
        questionIndex={1}
        totalQuestions={1}
        timerSeconds={timerSeconds}
        sessionId={assessmentId}
        onSubmit={handleSubmit}
      />

      <div className="min-h-0 flex-1">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left: question */}
          <Panel defaultSize={35} minSize={25}>
            <QuestionPanel question={mockQuestion} />
          </Panel>

          <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-zinc-600 transition-colors cursor-col-resize" />

          {/* Right: editor + console */}
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
                    onChange={(val) => setCode(currentLanguage, val)}
                    onSave={handleSave}
                  />
                </Panel>

                <PanelResizeHandle className="h-1 bg-zinc-800 hover:bg-zinc-600 transition-colors cursor-row-resize" />

                <Panel defaultSize={35} minSize={15}>
                  <PanelGroup direction="horizontal" className="h-full">
                    <Panel defaultSize={60}>
                      <ConsoleOutput
                        lines={consoleOutput}
                        status={
                          isRunning
                            ? 'running'
                            : testResults.length === 0
                              ? 'idle'
                              : testResults.every((r) => r.passed)
                                ? 'success'
                                : 'error'
                        }
                        onClear={clearOutput}
                      />
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-zinc-600 transition-colors cursor-col-resize" />

                    <Panel defaultSize={40} minSize={25}>
                      <TestRunner
                        onRun={handleRun}
                        results={testResults}
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
    </div>
  )
}
