import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react'
import { useCallback, useRef, useState } from 'react'
import type * as Monaco from 'monaco-editor'
import type { Language } from './templates'

interface CodeEditorProps {
  language: Language
  value: string
  onChange: (value: string) => void
  onSave: () => void
  compileError?: string | null
  readOnly?: boolean
  fontSize?: number
}

const MONACO_LANGUAGE: Record<Language, string> = {
  python:     'python',
  javascript: 'javascript',
  typescript: 'typescript',
  java:       'java',
  cpp:        'cpp',
  c:          'c',
  csharp:     'csharp',
  go:         'go',
  rust:       'rust',
  ruby:       'ruby',
  kotlin:     'kotlin',
  swift:      'swift',
  php:        'php',
  r:          'r',
  scala:      'scala',
  bash:       'shell',
  haskell:    'haskell',
  lua:        'lua',
  perl:       'perl',
  elixir:     'elixir',
}

const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('secureassess-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background':            '#1E1E2E',
      'editor.foreground':            '#CDD6F4',
      'editor.lineHighlightBackground': '#262637',
      'editor.selectionBackground':   '#3A3A6088',
      'editorCursor.foreground':      '#F06B28',
      'editorLineNumber.foreground':  '#585878',
      'editorLineNumber.activeForeground': '#CDD6F4',
      'editor.inactiveSelectionBackground': '#313150',
    },
  })
}

export function CodeEditor({
  language,
  value,
  onChange,
  onSave,
  compileError,
  readOnly = false,
  fontSize = 14,
}: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave()
      })

      editor.onDidChangeCursorPosition((e) => {
        setCursorPos({ line: e.position.lineNumber, col: e.position.column })
      })
    },
    [onSave],
  )

  const handleChange = useCallback(
    (val: string | undefined) => {
      if (editorRef.current && monacoRef.current) {
        monacoRef.current.editor.setModelMarkers(
          editorRef.current.getModel()!,
          'compile-error',
          [],
        )
      }
      onChange(val ?? '')
    },
    [onChange],
  )

  const applyMarkers = useCallback(
    (editor: Parameters<OnMount>[0], monaco: typeof Monaco) => {
      const model = editor.getModel()
      if (!model) return
      if (compileError) {
        const lineMatch = compileError.match(/line\s+(\d+)/i) ?? compileError.match(/:(\d+):/)
        const lineNumber = lineMatch ? parseInt(lineMatch[1], 10) : 1
        monaco.editor.setModelMarkers(model, 'compile-error', [
          {
            severity: monaco.MarkerSeverity.Error,
            message: compileError,
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: model.getLineMaxColumn(lineNumber),
          },
        ])
      } else {
        monaco.editor.setModelMarkers(model, 'compile-error', [])
      }
    },
    [compileError],
  )

  const handleMount2: OnMount = useCallback(
    (editor, monaco) => {
      handleMount(editor, monaco)
      applyMarkers(editor, monaco)
    },
    [handleMount, applyMarkers],
  )

  const prevCompileError = useRef<string | null | undefined>(undefined)
  if (prevCompileError.current !== compileError) {
    prevCompileError.current = compileError
    if (editorRef.current && monacoRef.current) {
      applyMarkers(editorRef.current, monacoRef.current)
    }
  }

  return (
    <div className="editor-zone flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={MONACO_LANGUAGE[language]}
          value={value}
          theme="secureassess-dark"
          beforeMount={defineTheme}
          onMount={handleMount2}
          onChange={handleChange}
          options={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize,
            lineHeight: 1.6,
            fontLigatures: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            padding: { top: 16, bottom: 16 },
            suggest: { showWords: true },
            tabSize: 4,
            wordWrap: 'off',
            automaticLayout: true,
            readOnly,
          }}
        />
      </div>

      {/* VS Code–style editor status line */}
      <div
        className="flex h-[22px] shrink-0 items-center gap-4 bg-[#1A1A2E] px-4 text-[11px] font-mono text-[#CDD6F4]/50"
        aria-hidden="true"
      >
        <span>{MONACO_LANGUAGE[language]}</span>
        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        <span>UTF-8</span>
        <span>Spaces: 4</span>
      </div>
    </div>
  )
}
