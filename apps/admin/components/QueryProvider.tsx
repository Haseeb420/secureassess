'use client'

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '../lib/api'

function handle401(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    toast.error('Your session expired. Please sign in again.')
    window.location.href = '/login'
  }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handle401 }),
        mutationCache: new MutationCache({ onError: handle401 }),
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
