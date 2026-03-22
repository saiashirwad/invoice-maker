import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { requireAdmin } from '@/lib/route-auth'
import {
  listAllUsers,
  listEntities,
  inviteUser,
  updateUser,
  getProcessedInvoiceCounts,
} from '@/lib/invoice-fns'
import { AdminLayout } from '@/components/AdminLayout'
import { EntityChip } from '@/components/admin/EntityChip'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  ChevronDown,
  FileText,
  Loader2,
  Search,
  Pencil,
  Search as SearchIcon,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

const roleOptions = ['all', 'user', 'admin', 'accountant'] as const
const roleLabel: Record<(typeof roleOptions)[number], string> = {
  all: 'All',
  user: 'Contractors',
  admin: 'Admins',
  accountant: 'Accountants',
}

type RoleFilter = (typeof roleOptions)[number]

type UserSearch = {
  q: string
  role: RoleFilter
  entityId: string
}

const UNASSIGNED_FILTER_KEY = '__unassigned__'

export const Route = createFileRoute('/admin/users')({
  beforeLoad: requireAdmin,
  validateSearch: (search: Record<string, unknown>): UserSearch => ({
    q: typeof search.q === 'string' ? search.q : '',
    role: (roleOptions.includes(search.role as RoleFilter)
      ? search.role
      : 'all') as RoleFilter,
    entityId: typeof search.entityId === 'string' ? search.entityId : '',
  }),
  loader: async () => {
    const [users, entities, counts] = await Promise.all([
      listAllUsers(),
      listEntities(),
      getProcessedInvoiceCounts(),
    ])
    return { users, entities, counts }
  },
  component: UsersPage,
})

type UserRow = Awaited<ReturnType<typeof listAllUsers>>[number]
type Entity = Awaited<ReturnType<typeof listEntities>>[number]

type DrawerMode = 'invite' | 'edit'

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  accountant:
    'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  user: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  accountant: 'Accountant',
  user: 'Contractor',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_STYLES[role] ?? ROLE_STYLES.user}`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

function toDisplayDate(value: Date | string | number | null | undefined): string {
  if (!value) return ''
  const date = typeof value === 'object' ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function toMillis(value: Date | string | number | null | undefined): number | null {
  if (!value) return null
  const date = typeof value === 'object' ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.getTime()
}

function getActivityLabel(lastInvoiceAt: Date | string | number | null | undefined) {
  const millis = toMillis(lastInvoiceAt)
  if (!millis) {
    return {
      label: 'No invoices',
      tone:
        'text-[var(--muted-foreground)] border-[var(--muted-foreground)]/30',
    }
  }

  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - millis) / (1000 * 60 * 60 * 24)),
  )

  if (ageDays === 0) {
    return {
      label: 'Active today',
      tone: 'text-[var(--foreground)] border-[var(--foreground)]/20',
      detail: toDisplayDate(millis),
    }
  }

  if (ageDays === 1) {
    return {
      label: 'Last active: yesterday',
      tone: 'text-[var(--foreground)] border-[var(--foreground)]/20',
      detail: toDisplayDate(millis),
    }
  }

  if (ageDays < 14) {
    return {
      label: `${ageDays} days ago`,
      tone: 'text-[var(--muted-foreground)] border-[var(--muted-foreground)]/20',
      detail: toDisplayDate(millis),
    }
  }

  if (ageDays < 45) {
    return {
      label: `${Math.ceil(ageDays / 7)} weeks ago`,
      tone: 'text-[var(--muted-foreground)] border-[var(--muted-foreground)]/20',
      detail: toDisplayDate(millis),
    }
  }

  return {
    label: `${Math.round(ageDays / 30)} months ago`,
    tone: 'text-[var(--muted-foreground)] border-[var(--muted-foreground)]/20',
    detail: toDisplayDate(millis),
  }
}

function AccessDrawer({
  mode,
  user,
  open,
  onOpenChange,
  entities,
  onSuccess,
}: {
  mode: DrawerMode
  user: UserRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  entities: Entity[]
  onSuccess: () => void
}) {
  const isInvite = mode === 'invite'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'admin' | 'accountant'>('user')
  const [entityId, setEntityId] = useState('')
  const [invoicePrefix, setInvoicePrefix] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    if (isInvite) {
      setName('')
      setEmail('')
      setRole('user')
      setEntityId(entities[0]?.id ?? '')
      setInvoicePrefix('')
      setError('')
      return
    }

    if (!user) return

    setName(user.name)
    setEmail(user.email)
    setRole(user.role)
    setEntityId(user.entityId ?? '')
    setInvoicePrefix(user.invoicePrefix ?? '')
    setError('')
  }, [isInvite, open, user, entities])

  useEffect(() => {
    if (!open) {
      setLoading(false)
    }
  }, [open])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isInvite && !user) return

    if (isInvite) {
      if (!name.trim() || !email.trim()) {
        setError('Name and email are required')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      if (isInvite) {
        await inviteUser({
          data: {
            name: name.trim(),
            email: email.trim(),
            role,
            entityId,
            invoicePrefix: role === 'user' ? invoicePrefix.trim() : undefined,
          },
        })
        toast.success(`${name.trim()} invited`)
        onOpenChange(false)
        onSuccess()
        return
      }

      if (!user) return

      const payload: {
        id: string
        role?: 'user' | 'admin' | 'accountant'
        entityId?: string
        invoicePrefix?: string
      } = {
        id: user.id,
        role,
        entityId,
      }

      if (role === 'user') {
        payload.invoicePrefix = invoicePrefix.trim()
      }

      await updateUser({ data: payload })
      toast.success(`${user.name} updated`)

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'focus-emerald h-9 w-full border-b border-[var(--border)]/75 bg-transparent px-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-foreground)]/50 hover:border-[var(--border)]'
  const selectClass =
    'focus-emerald h-9 w-full appearance-none border-b border-[var(--border)]/75 bg-transparent px-0 pr-6 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[var(--border)]'
  const labelClass =
    'mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]'

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false)
      }}
      handleOnly
      noBodyStyles
    >
      <DrawerContent className="!duration-0 !transition-none [&[data-vaul-drawer-direction=right]]:!translate-x-0 sm:max-w-[28rem]">
        <DrawerHeader className="border-b border-[var(--border)]">
          <DrawerTitle className="text-sm font-medium text-[var(--foreground)]">
            {isInvite ? 'Invite user' : 'Edit access'}
          </DrawerTitle>
          <DrawerDescription className="text-xs text-[var(--muted-foreground)]">
            {isInvite
              ? 'Add a new user and place them in the correct access role and entity.'
              : `${user?.name} · ${user?.email}`}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {isInvite && (
              <div>
                <label htmlFor="user-name" className={labelClass}>
                  Full name
                </label>
                <input
                  id="user-name"
                  autoFocus
                  className={inputClass}
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError('')
                  }}
                />
              </div>
            )}

            {isInvite && (
              <div>
                <label htmlFor="user-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="user-email"
                  type="email"
                  className={inputClass}
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="user-role" className={labelClass}>
                  Role
                </label>
                <div className="relative">
                  <select
                    id="user-role"
                    className={selectClass}
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value as 'user' | 'admin' | 'accountant')
                      setError('')
                    }}
                  >
                    <option value="user">Contractor</option>
                    <option value="admin">Admin</option>
                    <option value="accountant">Accountant</option>
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="user-entity" className={labelClass}>
                  Entity
                </label>
                <div className="relative">
                  <select
                    id="user-entity"
                    className={selectClass}
                    value={entityId}
                    onChange={(e) => {
                      setEntityId(e.target.value)
                      setError('')
                    }}
                  >
                    <option value="">Unassigned</option>
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                  />
                </div>
              </div>
            </div>

            {role === 'user' && (
              <div>
                <label htmlFor="user-prefix" className={labelClass}>
                  Invoice prefix
                </label>
                <input
                  id="user-prefix"
                  type="text"
                  maxLength={4}
                  className={inputClass}
                  placeholder="e.g. JS"
                  value={invoicePrefix}
                  onChange={(e) => {
                    setInvoicePrefix(e.target.value.toUpperCase())
                    setError('')
                  }}
                />
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Used in invoice IDs such as {invoicePrefix || 'JS'}-2026-001
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="space-y-2 pt-2">
              <Button className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {isInvite ? 'Inviting…' : 'Saving…'}
                  </>
                ) : isInvite ? (
                  'Invite user'
                ) : (
                  'Save changes'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function UsersPage() {
  const { users, entities, counts } = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate({ from: Route.fullPath })

  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)

  const entityMap = useMemo(
    () => new Map(entities.map((ent) => [ent.id, ent.name])),
    [entities],
  )

  const knownEntityIds = useMemo(() => new Set(entities.map((ent) => ent.id)), [entities])
  const normalizedEntityFilter =
    search.entityId === UNASSIGNED_FILTER_KEY || knownEntityIds.has(search.entityId)
      ? search.entityId
      : ''

  useEffect(() => {
    if (search.entityId === normalizedEntityFilter) return

    void navigate({
      to: '/admin/users',
      search: {
        ...search,
        entityId: normalizedEntityFilter,
      },
      replace: true,
    })
  }, [navigate, search, normalizedEntityFilter])

  function updateSearch(next: Partial<UserSearch>) {
    void navigate({
      to: '/admin/users',
      search: {
        ...search,
        ...next,
      },
      replace: true,
    })
  }

  const summaryByRole = useMemo(
    () =>
      users.reduce(
        (acc, userRow) => {
          acc[userRow.role] = acc[userRow.role] + 1
          return acc
        },
        {
          all: users.length,
          user: 0,
          admin: 0,
          accountant: 0,
        } as { all: number; user: number; admin: number; accountant: number },
      ),
    [users],
  )

  const missingAssignments = useMemo(
    () => users.filter((userRow) => !userRow.entityId).length,
    [users],
  )

  const entitySummary = useMemo(() => {
    const map = new Map<string, number>()

    for (const userRow of users) {
      if (!userRow.entityId) {
        const previous = map.get('__unassigned__') ?? 0
        map.set('__unassigned__', previous + 1)
        continue
      }
      const key = userRow.entityId
      map.set(key, (map.get(key) ?? 0) + 1)
    }

    const assigned = entities
      .map((ent) => ({
        key: ent.id,
        label: ent.name,
        count: map.get(ent.id) ?? 0,
      }))
      .filter((item) => item.count > 0)

    const unassigned = map.get('__unassigned__') ?? 0
    return {
      assigned,
      unassigned,
    }
  }, [entityMap, entities, users])

  const filtered = useMemo(() => {
    const q = search.q.trim().toLowerCase()
    let result = users

    if (q) {
      result = result.filter((userRow) => {
        const hasPrefix = (userRow.invoicePrefix ?? '').toLowerCase()
        const entity =
          (userRow.entityId
            ? (entityMap.get(userRow.entityId) ?? '').toLowerCase()
            : '')

        return (
          userRow.name.toLowerCase().includes(q) ||
          userRow.email.toLowerCase().includes(q) ||
          hasPrefix.includes(q) ||
          entity.includes(q)
        )
      })
    }

    if (search.role !== 'all') {
      result = result.filter((userRow) => userRow.role === search.role)
    }

    if (normalizedEntityFilter === UNASSIGNED_FILTER_KEY) {
      result = result.filter((userRow) => !userRow.entityId)
    } else if (normalizedEntityFilter) {
      result = result.filter((userRow) => userRow.entityId === normalizedEntityFilter)
    }

    return result
  }, [entityMap, normalizedEntityFilter, search.role, search.q, users])

  const filterChips = useMemo(
    () => [
      ...(search.q.trim()
        ? [
            {
              key: 'q',
              label: `Search: ${search.q.trim()}`,
              onClear: () => updateSearch({ q: '' }),
            },
          ]
        : []),
      ...(search.role !== 'all'
        ? [
            {
              key: 'role',
              label: `Role: ${roleLabel[search.role]}`,
              onClear: () => updateSearch({ role: 'all' }),
            },
          ]
        : []),
      ...(search.entityId
        ? [
            {
              key: 'entity',
              label:
                search.entityId === UNASSIGNED_FILTER_KEY
                  ? 'Entity: Unassigned'
                  : `Entity: ${
                      entities.find((ent) => ent.id === search.entityId)?.name ||
                      'Unknown'
                    }`,
              onClear: () => updateSearch({ entityId: '' }),
            },
          ]
        : []),
    ],
    [entities, search.entityId, search.q, search.role],
  )

  function openInvite() {
    setEditingUser(null)
    setDrawerMode('invite')
  }

  function openEditor(userRow: UserRow) {
    setEditingUser(userRow)
    setDrawerMode('edit')
  }

  function closeDrawer() {
    setDrawerMode(null)
    setEditingUser(null)
  }

  const hasFilters =
    search.q.trim().length > 0 || search.role !== 'all' || !!search.entityId

  return (
    <AdminLayout processedCount={counts.all} userCount={users.length}>
      <div className="space-y-6">
        {/* Control band */}
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Team access
              </h2>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {users.length} {users.length === 1 ? 'member' : 'members'} across
                {entitySummary.assigned.length} entities
              </p>
            </div>
            <Button size="sm" onClick={openInvite}>
              <UserPlus size={14} className="mr-1.5" />
              Invite User
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Contractors
              </p>
              <p className="mt-1.5 text-lg font-semibold text-[var(--foreground)]">
                {summaryByRole.user}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Admins
              </p>
              <p className="mt-1.5 text-lg font-semibold text-[var(--foreground)]">
                {summaryByRole.admin}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Accountants
              </p>
              <p className="mt-1.5 text-lg font-semibold text-[var(--foreground)]">
                {summaryByRole.accountant}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Missing entity
              </p>
              <p className="mt-1.5 text-lg font-semibold text-[var(--foreground)]">
                {missingAssignments}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              Entity split
            </span>
            {entitySummary.assigned.map((entry) => (
              <span
                key={entry.label}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px]"
              >
                <EntityChip entity={entry.label} />
                <span className="font-medium tabular-nums text-[var(--foreground)]">
                  {entry.count}
                </span>
              </span>
            ))}
            {entitySummary.unassigned > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px]">
                <span className="text-[var(--muted-foreground)]">Unassigned</span>
                <span className="font-medium tabular-nums text-[var(--foreground)]">
                  {entitySummary.unassigned}
                </span>
              </span>
            )}
          </div>
        </section>

        {/* Toolbar */}
        <section className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
              />
              <input
                value={search.q}
                onChange={(e) => updateSearch({ q: e.target.value })}
                type="search"
                placeholder="Search by name, email, prefix, or entity"
                className="focus-emerald h-9 w-full border-b border-[var(--border)]/75 bg-transparent pl-5 pr-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-foreground)]/50 hover:border-[var(--border)]"
              />
            </div>

            <div className="inline-flex w-full overflow-hidden rounded-full border border-[var(--border)] bg-[var(--card)] sm:w-auto">
              {roleOptions.map((option) => {
                const active = search.role === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateSearch({ role: option })}
                    className={`px-3 py-2 text-xs font-medium transition-colors sm:px-3.5 ${
                      active
                        ? 'bg-[var(--foreground)] text-[var(--background)]'
                        : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {roleLabel[option]}
                      {option !== 'all' ? ` (${summaryByRole[option]})` : ` (${users.length})`}
                  </button>
                )
              })}
            </div>

            <div className="relative min-w-0 sm:min-w-[220px]">
              <select
                value={search.entityId}
                onChange={(e) => updateSearch({ entityId: e.target.value })}
                className="focus-emerald h-9 w-full appearance-none rounded-full border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[var(--foreground)]/35"
              >
                <option value="">All entities</option>
                <option value={UNASSIGNED_FILTER_KEY}>Unassigned</option>
                {entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
              />
            </div>
          </div>

          {filterChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {filterChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--secondary)] px-2.5 py-1"
                >
                  <span className="text-[var(--muted-foreground)]">{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onClear}
                    className="rounded-full p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    aria-label={`Remove ${chip.label}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              {filterChips.length > 1 && (
                <button
                  type="button"
                  onClick={() => updateSearch({ q: '', role: 'all', entityId: '' })}
                  className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </section>

        {/* Grid */}
        <section className="overflow-hidden rounded-lg border border-[var(--border)]">
          {filtered.length > 0 ? (
            <div className="-mx-px overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--secondary)]">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Invoice prefix</th>
                    <th className="px-4 py-3 text-right">Invoice count</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((userRow) => {
                    const activity = getActivityLabel(userRow.lastInvoiceAt)
                    const entityLabel = userRow.entityId
                      ? (entityMap.get(userRow.entityId) ?? 'Unknown')
                      : 'Unassigned'
                    return (
                      <tr
                        key={userRow.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openEditor(userRow)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openEditor(userRow)
                          }
                        }}
                        className="cursor-pointer border-b border-[var(--border)] bg-[var(--background)] transition-colors hover:bg-[var(--surface-sunken)] focus-visible:bg-[var(--surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/15"
                      >
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {userRow.name}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                            {userRow.email}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <RoleBadge role={userRow.role} />
                        </td>
                        <td className="px-4 py-3.5">
                          {userRow.entityId ? (
                            <EntityChip entity={entityLabel} />
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-left font-mono text-xs tabular-nums text-[var(--foreground)]">
                          {userRow.invoicePrefix ? userRow.invoicePrefix : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[var(--foreground)]">
                          <span className="inline-flex items-center justify-end gap-1.5 text-xs font-medium">
                            <FileText size={12} />
                            {userRow.invoiceCount}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] tabular-nums ${activity.tone}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            <span>{activity.label}</span>
                          </span>
                          {activity.detail && (
                            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                              {activity.detail}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditor(userRow)
                              }}
                              className="rounded-md p-1.5 text-[var(--muted-foreground)] transition-all hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                              aria-label={`Edit ${userRow.name}`}
                            >
                              <Pencil size={13} />
                            </button>
                            {userRow.role === 'user' ? (
                              <Link
                                to="/contractors/$userId"
                                params={{ userId: userRow.id }}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded-md p-1.5 text-[var(--muted-foreground)] transition-all hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                                aria-label={`Open ${userRow.name} contractor profile`}
                              >
                                <SearchIcon size={13} />
                              </Link>
                            ) : (
                              <span className="rounded-md p-1.5 text-[var(--muted-foreground)] opacity-30">
                                <SearchIcon size={13} />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <Users size={24} className="text-[var(--muted-foreground)]" />
              <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                No users yet
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Invite someone to begin managing access.
              </p>
              <Button size="sm" className="mt-4" onClick={openInvite}>
                <UserPlus size={14} className="mr-1.5" />
                Invite User
              </Button>
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                No members match your search and filters.
              </p>
              {hasFilters && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateSearch({ q: '', role: 'all', entityId: '' })
                    }
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}

          {filtered.length > 0 && users.length !== filtered.length && (
            <p className="border-t border-[var(--border)] px-4 py-2.5 text-xs text-[var(--muted-foreground)]">
              Showing {filtered.length} of {users.length} users
            </p>
          )}
        </section>
      </div>

      <AccessDrawer
        mode={drawerMode ?? 'edit'}
        user={editingUser}
        open={drawerMode !== null}
        entities={entities}
        onOpenChange={(next) => {
          if (!next) {
            closeDrawer()
          }
        }}
        onSuccess={() => void router.invalidate()}
      />
    </AdminLayout>
  )
}
