import Editor, { type OnMount } from '@monaco-editor/react'
import { useCallback, useRef } from 'react'
import type * as Monaco from 'monaco-editor'
import type { Language } from './templates'

interface CodeEditorProps {
  language: Language
  value: string
  onChange: (value: string) => void
  onSave: () => void
  compileError?: string | null
  readOnly?: boolean
}

const MONACO_LANGUAGE: Record<Language, string> = {
  cpp: 'cpp',
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  java: 'java',
  go: 'go',
}

export function CodeEditor({
  language,
  value,
  onChange,
  onSave,
  compileError,
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave()
      })
    },
    [onSave],
  )

  const handleChange = useCallback(
    (val: string | undefined) => {
      // Clear markers when user edits
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

  // Apply compile error marker when compileError changes
  const applyMarkers = useCallback(
    (editor: Parameters<OnMount>[0], monaco: typeof Monaco) => {
      const model = editor.getModel()
      if (!model) return

      if (compileError) {
        // Try to parse line number from error; fall back to line 1
        const lineMatch = compileError.match(/line\s+(\d+)/i) ?? compileError.match(/:(\d+):/);
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

  // Re-apply markers when compileError prop changes after mount
  const prevCompileError = useRef<string | null | undefined>(undefined)
  if (prevCompileError.current !== compileError) {
    prevCompileError.current = compileError
    if (editorRef.current && monacoRef.current) {
      applyMarkers(editorRef.current, monacoRef.current)
    }
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={MONACO_LANGUAGE[language]}
        value={value}
        theme="vs-dark"
        onMount={handleMount2}
        onChange={handleChange}
        options={{
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 14,
          minimap: { enabled: false },
          lineNumbers: 'on',
          tabSize: 4,
          automaticLayout: true,
          bracketPairColorization: { enabled: true },
          readOnly,
          scrollBeyondLastLine: false,
          padding: { top: 8 },
        }}
      />
    </div>
  )
}
