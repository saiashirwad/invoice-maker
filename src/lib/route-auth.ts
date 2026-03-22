import { redirect } from '@tanstack/react-router'
import type { AppSession } from '@/lib/auth-client'

type RouteContext = {
  context: {
    session: AppSession
  }
}

function getDashboardPath(role: string): string {
  if (role === 'admin') return '/admin'
  if (role === 'accountant') return '/accountant'
  return '/user'
}

export function requireAuth({ context }: RouteContext) {
  const session = context.session

  if (!session?.user) {
    throw redirect({ to: '/' })
  }

  return { session }
}

export function requireUser({ context }: RouteContext) {
  const session = context.session

  if (!session?.user) {
    throw redirect({ to: '/' })
  }

  const role = (session.user as { role?: string }).role ?? 'user'
  if (role !== 'user') {
    throw redirect({ to: getDashboardPath(role) })
  }

  return { session }
}

export function requireAdmin({ context }: RouteContext) {
  const session = context.session

  if (!session?.user) {
    throw redirect({ to: '/' })
  }

  const role = (session.user as { role?: string }).role ?? 'user'
  if (role !== 'admin') {
    throw redirect({ to: getDashboardPath(role) })
  }

  return { session }
}

export function requireAccountant({ context }: RouteContext) {
  const session = context.session

  if (!session?.user) {
    throw redirect({ to: '/' })
  }

  const role = (session.user as { role?: string }).role ?? 'user'
  if (role !== 'accountant') {
    throw redirect({ to: getDashboardPath(role) })
  }

  return { session }
}

export function requireAdminOrAccountant({ context }: RouteContext) {
  const session = context.session

  if (!session?.user) {
    throw redirect({ to: '/' })
  }

  const role = (session.user as { role?: string }).role ?? 'user'
  if (role !== 'admin' && role !== 'accountant') {
    throw redirect({ to: getDashboardPath(role) })
  }

  return { session }
}
