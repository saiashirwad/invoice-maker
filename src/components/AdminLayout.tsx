import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'

export function AdminLayout({
  children,
  title,
  pendingCount,
  processedCount,
  userCount,
  wideCanvas,
  utility,
}: {
  children: ReactNode
  title?: string
  pendingCount?: number
  processedCount?: number
  userCount?: number
  wideCanvas?: boolean
  utility?: ReactNode
}) {
  return (
    <AdminShell
      title={title}
      pendingCount={pendingCount}
      processedCount={processedCount}
      userCount={userCount}
      wideCanvas={wideCanvas}
      utility={utility}
    >
      {children}
    </AdminShell>
  )
}
