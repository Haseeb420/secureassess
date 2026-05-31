import { useCallback, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'

interface AutoSaveProps {
  sessionId: string | null
  questionId: string | null
  language: string
  code: string
}

async function persistSnapshot(
  sessionId: string,
  questionId: string,
  language: string,
  code: string,
): Promise<void> {
  await invoke('save_code_snapshot', { sessionId, questionId, language, code })
  toast.success('Saved', { duration: 2000 })
}

export function useAutoSave({ sessionId, questionId, language, code }: AutoSaveProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const codeRef = useRef(code)
  codeRef.current = code

  const forceSave = useCallback(async () => {
    if (!sessionId || !questionId) return
    await persistSnapshot(sessionId, questionId, language, codeRef.current)
  }, [sessionId, questionId, language])

  // Debounce save on code change (3 s)
  useEffect(() => {
    if (!sessionId || !questionId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      persistSnapshot(sessionId, questionId, language, code)
    }, 3000)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [code, sessionId, questionId, language])

  // Periodic save every 30 s
  useEffect(() => {
    if (!sessionId || !questionId) return
    const id = setInterval(() => {
      persistSnapshot(sessionId, questionId, language, codeRef.current)
    }, 30_000)
    return () => clearInterval(id)
  }, [sessionId, questionId, language])

  return { forceSave }
}
