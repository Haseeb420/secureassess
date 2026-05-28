import { Component, type ErrorInfo, type ReactNode } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

function shortCode(message: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < message.length; i++) {
    h ^= message.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return h.toString(16).toUpperCase().slice(0, 6)
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    invoke('save_security_event', {
      sessionId: 'app',
      eventType: 'app_error',
      metadata: JSON.stringify({
        message: error.message,
        stack: error.stack?.slice(0, 500),
        componentStack: info.componentStack?.slice(0, 500),
      }),
    }).catch(() => {
      // DB may not be available; swallow silently
    })
  }

  render() {
    const { error } = this.state
    if (error) {
      const code = shortCode(error.message)
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
          <div
            role="alert"
            className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 px-8 py-10 text-center shadow-xl"
          >
            <div className="mb-4 text-4xl" aria-hidden="true">⚠</div>
            <h1 className="mb-2 text-lg font-semibold text-white">Something went wrong</h1>
            <p className="mb-6 text-sm text-zinc-400">
              Please restart the application to continue.
            </p>
            <p className="font-mono text-xs text-zinc-600">Error code: {code}</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
