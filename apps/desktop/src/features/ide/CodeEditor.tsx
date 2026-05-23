import Editor, { type OnMount } from '@monaco-editor/react'
import { useCallback, useRef } from 'react'
import type { Language } from './templates'

interface CodeEditorProps {
  language: Language
  value: string
  onChange: (value: string) => void
  onSave: () => void
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

export function CodeEditor({ language, value, onChange, onSave, readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor

      // Ctrl+S / Cmd+S → onSave
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave()
      })
    },
    [onSave],
  )

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={MONACO_LANGUAGE[language]}
        value={value}
        theme="vs-dark"
        onMount={handleMount}
        onChange={(val) => onChange(val ?? '')}
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
