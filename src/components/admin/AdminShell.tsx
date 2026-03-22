import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ClipboardCheck, Archive, Tag, Users, BarChart3 } from 'lucide-react'
import { Route as RootRoute } from '@/routes/__root'
import { UserMenu } from '@/components/UserMenu'


interface NavItem {
  to: string
  label: string
  icon: typeof ClipboardCheck
  badge?: number | string
}

const routeLabels: Record<string, string> = {
  '/admin': 'Review queue',
  '/admin/processed': 'Processed',
  '/admin/categories': 'Categories',
  '/admin/users': 'Users',
  '/admin/reporting': 'Reporting',
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operations',
    items: [
      {
        to: '/admin',
        label: 'Review',
        icon: ClipboardCheck,
      },
      {
        to: '/admin/processed',
        label: 'Processed',
        icon: Archive,
      },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        to: '/admin/categories',
        label: 'Categories',
        icon: Tag,
      },
      {
        to: '/admin/users',
        label: 'Users',
        icon: Users,
      },
      {
        to: '/admin/reporting',
        label: 'Reporting',
        icon: BarChart3,
      },
    ],
  },
]

type AdminShellProps = {
  children: ReactNode
  title?: string
  pendingCount?: number
  processedCount?: number
  userCount?: number
  wideCanvas?: boolean
}

export function AdminShell({
  children,
  pendingCount,
  processedCount,
  userCount,
  wideCanvas = false,
  title,
}: AdminShellProps) {
  const { session } = RootRoute.useRouteContext()
  const location = useLocation()
  const path = location.pathname
  const normalizedPath =
    path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path
  const routeLabel = routeLabels[normalizedPath] ?? title ?? 'Admin'

  const navItems = navSections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      badge:
        item.to === '/admin'
          ? pendingCount && pendingCount > 0
            ? pendingCount
            : undefined
          : item.to === '/admin/processed'
            ? processedCount && processedCount > 0
              ? processedCount
              : undefined
            : item.to === '/admin/users'
              ? userCount && userCount > 0
                ? userCount
                : undefined
              : undefined,
    })),
  }))

  function isActive(to: string) {
    if (to === '/admin') return normalizedPath === '/admin'
    return normalizedPath.startsWith(to)
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)] lg:hidden">
        <div className="flex h-14 items-center justify-between px-5 sm:px-8">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Admin
            </p>
            <h1 className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">
              {routeLabel}
            </h1>
          </div>
          {session?.user && (
            <UserMenu name={session.user.name} email={session.user.email} />
          )}
        </div>
      </header>

      <nav className="sticky top-14 z-40 flex border-b border-[var(--border)] bg-[var(--background)] px-5 py-1.5 sm:px-8 lg:hidden">
        {navItems
          .flatMap((section) => section.items)
          .map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`mr-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive(item.to)
                  ? 'bg-[var(--secondary)] text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {item.label}
              {item.badge !== undefined && (
                <span className="rounded-full bg-[var(--foreground)]/10 px-1.5 py-0.5 text-[10px] tabular-nums">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
      </nav>

      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-[15rem] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--secondary)]/45 lg:flex">
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

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
            {navItems.map((section) => {
              return (
                <div key={section.title} className="space-y-0.5">
                  <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.to)
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'border border-[var(--emerald)]/40 bg-[var(--background)] font-medium text-[var(--foreground)]'
                            : 'text-[var(--muted-foreground)] hover:bg-[var(--background)]/80 hover:text-[var(--foreground)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={15} />
                          {item.label}
                        </div>
                        {item.badge !== undefined && (
                          <span className="rounded-full bg-[var(--foreground)]/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[var(--muted-foreground)]">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>

        </aside>

        <main className="min-w-0 flex-1">
          <div
            className={`mx-auto w-full px-4 py-5 sm:px-8 ${wideCanvas ? 'max-w-[1280px]' : 'max-w-[1080px]'}`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
