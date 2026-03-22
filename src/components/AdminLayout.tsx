import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Route as RootRoute } from '@/routes/__root'
import { UserMenu } from '@/components/UserMenu'
import { ClipboardCheck, Archive, Tag, Users, BarChart3 } from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: typeof ClipboardCheck
  badge?: number | string
}

export function AdminLayout({
  children,
  title,
  pendingCount,
  processedCount,
  userCount,
}: {
  children: ReactNode
  title?: string
  pendingCount?: number
  processedCount?: number
  userCount?: number
}) {
  const { session } = RootRoute.useRouteContext()
  const location = useLocation()
  const path = location.pathname

  const nav: NavItem[] = [
    {
      to: '/admin',
      label: 'Review',
      icon: ClipboardCheck,
      badge: pendingCount && pendingCount > 0 ? pendingCount : undefined,
    },
    {
      to: '/admin/processed',
      label: 'Processed',
      icon: Archive,
      badge: processedCount && processedCount > 0 ? processedCount : undefined,
    },
    {
      to: '/admin/categories',
      label: 'Categories',
      icon: Tag,
    },
    {
      to: '/admin/users',
      label: 'Users',
      icon: Users,
      badge: userCount && userCount > 0 ? userCount : undefined,
    },
    {
      to: '/admin/reporting',
      label: 'Reporting',
      icon: BarChart3,
    },
  ]

  function isActive(to: string) {
    if (to === '/admin') return path === '/admin' || path === '/admin/'
    return path.startsWith(to)
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Mobile: header + horizontal nav */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)] lg:hidden">
        <div className="flex h-14 items-center justify-between px-5 sm:px-8">
          <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
            Admin
          </h1>
          {session?.user && (
            <UserMenu name={session.user.name} email={session.user.email} />
          )}
        </div>
      </header>

      <nav className="flex border-b border-[var(--border)] bg-[var(--background)] px-5 sm:px-8 lg:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              isActive(item.to)
                ? 'border-[var(--emerald)] text-[var(--foreground)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {item.label}
            {item.badge !== undefined && (
              <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] tabular-nums">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="flex">
        {/* Desktop: sidebar with user menu at top */}
        <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-r border-[var(--border)] lg:flex">
          {/* User at top of sidebar */}
          {session?.user && (
            <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-[10px] font-semibold text-[var(--background)]">
                {session.user.name
                  .split(' ')
                  .map((w: string) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--foreground)]">
                  {session.user.name}
                </div>
                {session.user.email && (
                  <div className="truncate text-[10px] text-[var(--muted-foreground)]">
                    {session.user.email}
                  </div>
                )}
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-0.5 p-3">
            {nav.map((item) => {
              const Icon = item.icon
              const active = isActive(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'border-l-2 border-l-[var(--emerald)] bg-[var(--muted)] font-medium text-[var(--foreground)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} />
                    {item.label}
                  </div>
                  {item.badge !== undefined && (
                    <span className="rounded-full bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[var(--muted-foreground)]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
            {title && (
              <h1 className="mb-5 text-base font-semibold text-[var(--foreground)] lg:hidden">
                {title}
              </h1>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
