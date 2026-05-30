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
        <div className="flex min-h-screen items-center justify-center bg-brand-surface p-6">
          <div
            role="alert"
            className="w-full max-w-sm rounded-xl border border-brand-border bg-white px-8 py-10 text-center shadow-xl"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="mb-2 text-lg font-semibold text-brand-navy">Something went wrong</h1>
            <p className="mb-3 text-sm text-brand-navy/60">{error.message.slice(0, 100)}</p>
            <p className="mb-6 font-mono text-xs text-brand-navy/30">Code: {code}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors"
            >
              Restart Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
