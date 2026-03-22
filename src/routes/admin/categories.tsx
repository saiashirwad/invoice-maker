import { useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { requireAdmin } from '@/lib/route-auth'
import {
  listCategories,
  createCategory,
  deleteCategory,
  renameCategory,
  getProcessedInvoiceCounts,
} from '@/lib/invoice-fns'
import { Button } from '@/components/ui/button'
import { AdminLayout } from '@/components/AdminLayout'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/categories')({
  beforeLoad: requireAdmin,
  loader: async () => {
    const [categories, counts] = await Promise.all([
      listCategories(),
      getProcessedInvoiceCounts(),
    ])
    return { categories, counts }
  },
  component: CategoriesPage,
})

function CategoriesPage() {
  const { categories, counts } = Route.useLoaderData()
  const router = useRouter()
  const [showAddInput, setShowAddInput] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  const totalInvoices = categories.reduce(
    (sum, c) => sum + (c.invoiceCount ?? 0),
    0,
  )
  const maxInvoices = Math.max(...categories.map((c) => c.invoiceCount ?? 0), 1)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return

    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setError('Category already exists')
      return
    }

    setCreating(true)
    setError('')
    try {
      await createCategory({ data: { name } })
      setNewName('')
      setShowAddInput(false)
      toast.success(`Added "${name}"`)
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    setDeleting(id)
    try {
      await deleteCategory({ data: { id } })
      toast.success(`Deleted "${name}"`)
      await router.invalidate()
    } finally {
      setDeleting(null)
    }
  }

  function startEditing(id: string, name: string) {
    setEditingId(id)
    setEditName(name)
  }

  async function handleRename(id: string) {
    const name = editName.trim()
    if (!name) {
      setEditingId(null)
      return
    }

    const original = categories.find((c) => c.id === id)
    if (original && original.name === name) {
      setEditingId(null)
      return
    }

    if (
      categories.some(
        (c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      toast.error('Category already exists')
      return
    }

    try {
      await renameCategory({ data: { id, name } })
      setEditingId(null)
      toast.success(`Renamed to "${name}"`)
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename')
    }
  }

  return (
    <AdminLayout processedCount={counts.all}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Categories
          </h2>
          {categories.length > 0 && (
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {totalInvoices} {totalInvoices === 1 ? 'invoice' : 'invoices'}{' '}
              across {categories.length}{' '}
              {categories.length === 1 ? 'category' : 'categories'}
            </p>
          )}
        </div>
        {!showAddInput && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowAddInput(true)
              setTimeout(() => addInputRef.current?.focus(), 0)
            }}
          >
            <Plus size={14} className="mr-1.5" />
            Add Category
          </Button>
        )}
      </div>

      {/* Inline add form */}
      {showAddInput && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="mb-5 flex items-center gap-3"
        >
          <div className="relative flex-1 max-w-xs">
            <input
              ref={addInputRef}
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowAddInput(false)
                  setNewName('')
                  setError('')
                }
              }}
              placeholder="Category name..."
              className="focus-emerald h-9 w-full border-b border-[var(--border)]/75 bg-transparent px-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-foreground)]/50 hover:border-[var(--border)]"
              autoFocus
            />
          </div>
          <Button type="submit" size="sm" disabled={!newName.trim() || creating}>
            {creating ? 'Adding...' : 'Add'}
          </Button>
          <button
            type="button"
            onClick={() => {
              setShowAddInput(false)
              setNewName('')
              setError('')
            }}
            className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X size={14} />
          </button>
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </form>
      )}

      {/* Category list */}
      {categories.length > 0 ? (
        <div className="divide-y divide-[var(--border)]">
          {categories.map((cat) => {
            const invoiceCount = cat.invoiceCount ?? 0
            const isDeleting = deleting === cat.id
            const isEditing = editingId === cat.id
            const barWidth =
              maxInvoices > 0 ? (invoiceCount / maxInvoices) * 100 : 0
            const isEmpty = invoiceCount === 0

            return (
              <div
                key={cat.id}
                className={`group relative flex items-center gap-3 py-3.5 transition-colors hover:bg-[var(--accent)]/50 ${isDeleting ? 'opacity-50' : ''}`}
              >
                {/* Volume bar */}
                {invoiceCount > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-r bg-[var(--emerald)]/[0.05] transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                )}

                {/* Name */}
                <div className="relative min-w-0 flex-1">
                  {isEditing ? (
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void handleRename(cat.id)
                      }}
                    >
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="focus-emerald h-7 w-48 border-b border-[var(--border)]/75 bg-transparent px-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="shrink-0 rounded-md p-1 text-[var(--emerald)] hover:bg-[var(--emerald)]/10"
                        aria-label="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="shrink-0 rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                        aria-label="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <span
                      className={`truncate text-sm ${isEmpty ? 'text-[var(--muted-foreground)]' : 'font-medium text-[var(--foreground)]'}`}
                      onDoubleClick={() => startEditing(cat.id, cat.name)}
                    >
                      {cat.name}
                    </span>
                  )}
                </div>

                {/* Actions (hover-reveal) */}
                {!isEditing && (
                  <div className="relative flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => startEditing(cat.id, cat.name)}
                      className="shrink-0 rounded-md p-1.5 text-[var(--muted-foreground)]/40 transition-all hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                      aria-label={`Rename ${cat.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => void handleDelete(cat.id, cat.name)}
                      disabled={isDeleting}
                      className="shrink-0 rounded-md p-1.5 text-[var(--muted-foreground)]/40 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-400"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                {/* Invoice count */}
                <span
                  className={`relative min-w-[5rem] shrink-0 text-right text-xs tabular-nums ${
                    isEmpty
                      ? 'italic text-[var(--muted-foreground)]/50'
                      : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  {isEmpty
                    ? 'No invoices'
                    : `${invoiceCount} ${invoiceCount === 1 ? 'invoice' : 'invoices'}`}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-16 text-center">
          <p className="text-sm font-medium text-[var(--foreground)]">
            No categories yet
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Add categories to organize invoices by type of work
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => {
              setShowAddInput(true)
              setTimeout(() => addInputRef.current?.focus(), 0)
            }}
          >
            <Plus size={14} className="mr-1.5" />
            Add Category
          </Button>
        </div>
      )}
    </AdminLayout>
  )
}
