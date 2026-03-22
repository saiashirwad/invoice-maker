import { useState, useMemo } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { requireAdmin } from '@/lib/route-auth'
import {
  listAllUsers,
  listEntities,
  inviteUser,
  updateUser,
  getProcessedInvoiceCounts,
} from '@/lib/invoice-fns'
import { AdminLayout } from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  UserPlus,
  Search,
  Loader2,
  ChevronDown,
  Pencil,
  Users,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/users')({
  beforeLoad: requireAdmin,
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

// ─── Role Badge ──────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  admin:
    'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  accountant:
    'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  user: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

const AVATAR_COLORS: Record<string, string> = {
  admin:
    'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  accountant:
    'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  user: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
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

// ─── Invite Dialog ───────────────────────────────────────────────────

function InviteDialog({
  open,
  onOpenChange,
  entities,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  entities: Entity[]
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'user' as 'user' | 'admin' | 'accountant',
    entityId: entities[0]?.id ?? '',
    invoicePrefix: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required')
      return
    }
    setLoading(true)
    setError('')
    try {
      await inviteUser({ data: form })
      toast.success(`${form.name.trim()} added`)
      setForm({
        name: '',
        email: '',
        role: 'user',
        entityId: entities[0]?.id ?? '',
        invoicePrefix: '',
      })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user')
    } finally {
      setLoading(false)
    }
  }

  const selectClass =
    'focus-emerald h-9 w-full appearance-none border-b border-[var(--border)]/75 bg-transparent px-0 pr-6 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[var(--border)]'
  const inputClass =
    'focus-emerald h-9 w-full border-b border-[var(--border)]/75 bg-transparent px-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-foreground)]/50 hover:border-[var(--border)]'
  const labelClass =
    'mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Create a new user account. They can sign in with Google using this
            email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 pt-2">
          <div>
            <label htmlFor="inv-name" className={labelClass}>
              Full Name
            </label>
            <input
              id="inv-name"
              type="text"
              autoFocus
              className={inputClass}
              placeholder="Jane Smith"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="inv-email" className={labelClass}>
              Email
            </label>
            <input
              id="inv-email"
              type="email"
              className={inputClass}
              placeholder="jane@company.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-role" className={labelClass}>
                Role
              </label>
              <div className="relative">
                <select
                  id="inv-role"
                  className={selectClass}
                  value={form.role}
                  onChange={(e) =>
                    update(
                      'role',
                      e.target.value,
                    )
                  }
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
              <label htmlFor="inv-entity" className={labelClass}>
                Entity
              </label>
              <div className="relative">
                <select
                  id="inv-entity"
                  className={selectClass}
                  value={form.entityId}
                  onChange={(e) => update('entityId', e.target.value)}
                >
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

          {form.role === 'user' && (
            <div>
              <label htmlFor="inv-prefix" className={labelClass}>
                Invoice Prefix
              </label>
              <input
                id="inv-prefix"
                type="text"
                className={inputClass}
                placeholder="e.g. JS"
                value={form.invoicePrefix}
                onChange={(e) =>
                  update('invoicePrefix', e.target.value.toUpperCase())
                }
                maxLength={4}
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Used for invoice numbers like JS-2026-001
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  Add User
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Dialog ─────────────────────────────────────────────────────

function EditDialog({
  user: editUser,
  open,
  onOpenChange,
  entities,
  onSuccess,
}: {
  user: UserRow | null
  open: boolean
  onOpenChange: (v: boolean) => void
  entities: Entity[]
  onSuccess: () => void
}) {
  const [role, setRole] = useState(editUser?.role ?? 'user')
  const [entityId, setEntityId] = useState(editUser?.entityId ?? '')
  const [prefix, setPrefix] = useState(editUser?.invoicePrefix ?? '')
  const [loading, setLoading] = useState(false)

  // Sync state when user changes
  if (editUser && role !== editUser.role && !loading) {
    setRole(editUser.role)
    setEntityId(editUser.entityId ?? '')
    setPrefix(editUser.invoicePrefix ?? '')
  }

  async function handleSave() {
    if (!editUser) return
    setLoading(true)
    try {
      await updateUser({
        data: {
          id: editUser.id,
          role: role as 'user' | 'admin' | 'accountant',
          entityId,
          invoicePrefix: prefix,
        },
      })
      toast.success(`${editUser.name} updated`)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  if (!editUser) return null

  const selectClass =
    'focus-emerald h-9 w-full appearance-none border-b border-[var(--border)]/75 bg-transparent px-0 pr-6 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[var(--border)]'
  const inputClass =
    'focus-emerald h-9 w-full border-b border-[var(--border)]/75 bg-transparent px-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-foreground)]/50 hover:border-[var(--border)]'
  const labelClass =
    'mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            {editUser.name} &middot; {editUser.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-role" className={labelClass}>
                Role
              </label>
              <div className="relative">
                <select
                  id="edit-role"
                  className={selectClass}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
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
              <label htmlFor="edit-entity" className={labelClass}>
                Entity
              </label>
              <div className="relative">
                <select
                  id="edit-entity"
                  className={selectClass}
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                >
                  <option value="">None</option>
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
              <label htmlFor="edit-prefix" className={labelClass}>
                Invoice Prefix
              </label>
              <input
                id="edit-prefix"
                type="text"
                className={inputClass}
                placeholder="e.g. JS"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                maxLength={4}
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              disabled={loading}
              onClick={() => void handleSave()}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────

function UsersPage() {
  const { users, entities, counts } = Route.useLoaderData()
  const router = useRouter()

  const [showInvite, setShowInvite] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    let result = users
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.invoicePrefix ?? '').toLowerCase().includes(q),
      )
    }
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter)
    }
    return result
  }, [users, search, roleFilter])

  const entityMap = new Map(entities.map((e) => [e.id, e.name]))

  const roleCounts = useMemo(() => {
    const c: Record<string, number> = { all: users.length }
    for (const u of users) {
      c[u.role] = (c[u.role] ?? 0) + 1
    }
    return c
  }, [users])

  return (
    <AdminLayout processedCount={counts.all} userCount={users.length}>
      {/* Header bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Team Members
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {users.length} {users.length === 1 ? 'user' : 'users'} across{' '}
            {entities.length} {entities.length === 1 ? 'entity' : 'entities'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowInvite(true)}
        >
          <UserPlus size={14} className="mr-1.5" />
          Add User
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-0 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />
          <input
            type="text"
            className="focus-emerald h-9 w-full border-b border-[var(--border)]/75 bg-transparent pl-5 pr-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-foreground)]/50 hover:border-[var(--border)]"
            placeholder="Search by name, email, or prefix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-0.5 rounded-full bg-[var(--muted)]/60 p-0.5">
          {(['all', 'user', 'admin', 'accountant'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                roleFilter === r
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
              }`}
            >
              {r === 'all'
                ? 'All'
                : r === 'user'
                  ? 'Contractors'
                  : r === 'admin'
                    ? 'Admins'
                    : 'Accountants'}
              {roleCounts[r] !== undefined && (
                <span className="ml-1 tabular-nums opacity-60">
                  {roleCounts[r]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      {filtered.length > 0 ? (
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((u) => (
            <div
              key={u.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                u.role === 'user'
                  ? router.navigate({
                      to: '/contractors/$userId',
                      params: { userId: u.id },
                    })
                  : setEditingUser(u)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (u.role === 'user')
                    void router.navigate({
                      to: '/contractors/$userId',
                      params: { userId: u.id },
                    })
                  else setEditingUser(u)
                }
              }}
              className="group flex cursor-pointer items-center gap-3 py-3.5 transition-colors hover:bg-[var(--accent)]/50"
            >
              {/* Avatar */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${AVATAR_COLORS[u.role] ?? AVATAR_COLORS.user}`}>
                {u.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {u.name}
                  </span>
                  <RoleBadge role={u.role} />
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <span className="truncate">{u.email}</span>
                  <span className="opacity-30">&middot;</span>
                  <span>
                    {u.entityId
                      ? (entityMap.get(u.entityId) ?? u.entityId)
                      : '—'}
                  </span>
                  {u.invoicePrefix && (
                    <>
                      <span className="opacity-30">&middot;</span>
                      <span className="font-mono text-[11px]">
                        {u.invoicePrefix}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Stats — fixed-width column for alignment */}
              <div className="hidden w-14 shrink-0 items-center justify-end gap-1.5 text-xs text-[var(--muted-foreground)] sm:flex">
                {u.role === 'user' && (
                  <>
                    <FileText size={12} />
                    <span className="tabular-nums">
                      {u.invoiceCount ?? 0}
                    </span>
                  </>
                )}
              </div>

              {/* Edit */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingUser(u)
                }}
                className="shrink-0 rounded-md p-1.5 text-[var(--muted-foreground)]/40 transition-all hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label={`Edit ${u.name}`}
              >
                <Pencil size={13} />
              </button>

            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-16 text-center">
          <Users size={24} className="mb-3 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">
            No users yet
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Add your first team member to get started
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => setShowInvite(true)}
          >
            <UserPlus size={14} className="mr-1.5" />
            Add User
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            No users match your search
          </p>
        </div>
      )}

      {/* Summary */}
      {filtered.length > 0 && filtered.length !== users.length && (
        <div className="mt-4 text-xs text-[var(--muted-foreground)]">
          Showing {filtered.length} of {users.length} users
        </div>
      )}

      <InviteDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        entities={entities}
        onSuccess={() => void router.invalidate()}
      />

      <EditDialog
        user={editingUser}
        open={editingUser !== null}
        onOpenChange={(v) => {
          if (!v) setEditingUser(null)
        }}
        entities={entities}
        onSuccess={() => void router.invalidate()}
      />
    </AdminLayout>
  )
}
