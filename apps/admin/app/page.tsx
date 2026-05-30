import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '../lib/auth'

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    const role = (session.user as { role?: string }).role ?? 'candidate'
    if (role !== 'candidate') {
      redirect('/dashboard')
    }
  }

  redirect('/login')
}
