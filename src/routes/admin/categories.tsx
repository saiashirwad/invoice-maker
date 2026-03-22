import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { requireAdmin } from '@/lib/route-auth'
import {
  listCategories,
  createCategory,
  deleteCategory,
  renameCategory,
  getProcessedInvoiceCounts,
  getCategoryOverview,
} from '@/lib/invoice-fns'
import { AdminLayout } from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Check,
  Info,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

type CategoryRow = Awaited<ReturnType<typeof listCategories>>[number]
type CategoryOverview = Awaited<ReturnType<typeof getCategoryOverview>>
type InspectorMode = 'create' | 'rename'
type UndoState = { name: string } | null

export const Route = createFileRoute('/admin/categories')({
  beforeLoad: requireAdmin,
  loader: async () => {
    const [categories, counts, overview] = await Promise.all([
      listCategories(),
      getProcessedInvoiceCounts(),
      getCategoryOverview(),
    ])
    return { categories, counts, overview }
  },
  component: CategoriesPage,
})

function toPercent(count: number, total: number) {
  if (!total) return 0
  return Math.round((count / total) * 1000) / 10
}

function formatLastUsed(value?: CategoryRow['lastUsedAt']) {
  if (!value) return 'Never used'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCount(count: number) {
  return `${count} ${count === 1 ? 'invoice' : 'invoices'}`
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
    </div>
  )
}

function CategoriesPage() {
  const { categories, counts, overview } = Route.useLoaderData()
  const router = useRouter()

  const [inspectorMode, setInspectorMode] = useState<InspectorMode | null>(null)
  const [inspectorCategoryId, setInspectorCategoryId] = useState<string | null>(
    null,
  )
  const [inspectorCategoryName, setInspectorCategoryName] = useState('')
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorError, setInspectorError] = useState('')
  const [inspectorSaving, setInspectorSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [undoState, setUndoState] = useState<UndoState>(null)
  const [undoSaving, setUndoSaving] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
    },
    [],
  )

  const categoryRows = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aCount = a.invoiceCount ?? 0
      const bCount = b.invoiceCount ?? 0
      if (aCount === bCount) {
        return a.name.localeCompare(b.name)
      }
      return bCount - aCount
    })
  }, [categories])

  const categorizedInvoiceCount = categories.reduce(
    (sum, row) => sum + (row.invoiceCount ?? 0),
    0,
  )
  const categoriesInUse = categoryRows.filter(
    (row) => (row.invoiceCount ?? 0) > 0,
  ).length
  const defaultedCategories = categoryRows.filter(
    (row) => (row.defaultProfileCount ?? 0) > 0,
  ).length
  const defaultProfilesSet = overview.usersWithDefaultCategory

  function openCreateInspector() {
    setInspectorMode('create')
    setInspectorCategoryId(null)
    setInspectorCategoryName('')
    setInspectorError('')
    setInspectorOpen(true)
  }

  function openRenameInspector(category: CategoryRow) {
    setInspectorMode('rename')
    setInspectorCategoryId(category.id)
    setInspectorCategoryName(category.name)
    setInspectorError('')
    setInspectorOpen(true)
  }

  function closeInspector() {
    setInspectorOpen(false)
    setInspectorMode(null)
    setInspectorCategoryId(null)
    setInspectorCategoryName('')
    setInspectorError('')
  }

  async function handleInspectorSubmit(e: FormEvent) {
    e.preventDefault()
    const name = inspectorCategoryName.trim()
    if (!name) {
      setInspectorError('Category name is required')
      return
    }

    if (
      categories.some(
        (category) =>
          category.id !== inspectorCategoryId &&
          category.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setInspectorError('Category already exists')
      return
    }

    setInspectorSaving(true)
    setInspectorError('')
    try {
      if (inspectorMode === 'rename' && inspectorCategoryId) {
        await renameCategory({ data: { id: inspectorCategoryId, name } })
        toast.success(`Renamed to "${name}"`)
      } else {
        await createCategory({ data: { name } })
        toast.success(`Added "${name}"`)
      }

      await router.invalidate()
      closeInspector()
    } catch (err) {
      setInspectorError(
        err instanceof Error ? err.message : 'Failed to save category',
      )
    } finally {
      setInspectorSaving(false)
    }
  }

  function closeDeleteDialog() {
    if (deleting) return
    setDeleteTarget(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const deleted = await deleteCategory({ data: { id: deleteTarget.id } })
      const affectedInvoices =
        typeof deleted?.affectedInvoiceCount === 'number'
          ? deleted.affectedInvoiceCount
          : deleteTarget.invoiceCount ?? 0

      await router.invalidate()
      setDeleteTarget(null)

      if (affectedInvoices > 0) {
        toast.success(
          `Deleted ${deleteTarget.name}. ${affectedInvoices} invoice${affectedInvoices === 1 ? '' : 's'} will be uncategorized.`,
        )
        setUndoState(null)
      } else {
        toast.success(`Deleted ${deleteTarget.name}.`)
        if (undoTimerRef.current) {
          clearTimeout(undoTimerRef.current)
        }
        setUndoState({ name: deleteTarget.name })
        undoTimerRef.current = setTimeout(() => {
          setUndoState(null)
        }, 10000)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  async function handleUndoDelete() {
    if (!undoState) return

    setUndoSaving(true)
    try {
      const restored = undoState.name
      await createCategory({ data: { name: restored } })
      await router.invalidate()
      setUndoState(null)
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
      toast.success(`Restored ${restored}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restore')
    } finally {
      setUndoSaving(false)
    }
  }

  return (
    <AdminLayout processedCount={counts.all}>
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Categories
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-[var(--muted-foreground)]">
              Maintain taxonomy labels used by reporting and invoice creation. Keep
              names explicit and intentionally ordered to avoid noisy classifying.
            </p>
          </div>
          <Button size="sm" onClick={openCreateInspector}>
            <Plus size={14} className="mr-1.5" />
            Add Category
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Total categories" value={categoryRows.length.toString()} />
          <SummaryStat
            label="Categories in use"
            value={`${categoriesInUse} of ${categoryRows.length}`}
          />
          <SummaryStat
            label="Uncategorized invoices"
            value={overview.uncategorizedInvoices.toString()}
          />
          <SummaryStat
            label="Defaults context"
            value={`${defaultedCategories} ${defaultedCategories === 1 ? 'category' : 'categories'} with defaults, used by ${pluralize(defaultProfilesSet, 'profile', 'profiles')}`}
          />
        </div>
      </div>

      {undoState && (
        <div className="mb-4 rounded-md border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 text-sm text-[var(--foreground)] dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex flex-wrap items-center gap-2">
            <Info size={14} className="text-emerald-600" />
            <span>
              {undoState.name} was deleted. You can undo while this banner is
              visible.
            </span>
            <button
              type="button"
              onClick={() => void handleUndoDelete()}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-600/30 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-950"
              disabled={undoSaving}
            >
              <RotateCcw size={13} />
              {undoSaving ? 'Undoing…' : 'Undo delete'}
            </button>
          </div>
        </div>
      )}

      {categoryRows.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="hidden border-b border-[var(--border)] bg-[var(--secondary)]/40 px-3 py-2 text-[11px] font-medium text-[var(--muted-foreground)] md:grid md:grid-cols-[2fr_1.7fr_1fr_0.8fr_0.8fr] md:gap-4 md:items-center">
            <span>Category</span>
            <span>Usage and share</span>
            <span>Last used</span>
            <span>Defaults</span>
            <span>Actions</span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {categoryRows.map((cat) => {
              const invoiceCount = cat.invoiceCount ?? 0
              const defaultProfileCount = cat.defaultProfileCount ?? 0
              const share = toPercent(invoiceCount, categorizedInvoiceCount)
              const usageWidth = `${Math.min(100, share)}%`

              return (
              <div
                  key={cat.id}
                  className="px-3 py-3"
                >
                  <div className="grid gap-2 md:grid-cols-[2fr_1.7fr_1fr_0.8fr_0.8fr] md:items-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {cat.name}
                      </p>
                      {defaultProfileCount > 0 ? (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          {pluralize(
                            defaultProfileCount,
                            'default profile',
                            'default profiles',
                          )}{defaultProfileCount === 1 ? ' uses' : ' use'} this category by default
                        </p>
                      ) : (
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          Not set as default on any profile
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
                        <span className="font-medium text-[var(--foreground)]">
                          {formatCount(invoiceCount)}
                        </span>
                        <span>{share.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-[var(--muted)]">
                        <div
                          className="h-full bg-emerald-500/45 transition-all"
                          style={{ width: usageWidth }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatLastUsed(cat.lastUsedAt)}
                    </p>

                    <p className="text-xs text-[var(--muted-foreground)]">
                      {defaultProfileCount}
                      {defaultProfileCount === 1
                        ? ' profile uses this as default'
                        : ' profiles use this as default'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openRenameInspector(cat)}
                        disabled={deleting}
                      >
                        <Pencil size={13} className="mr-1.5" />
                        Rename
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget(cat)}
                        disabled={deleting}
                      >
                        <Trash2 size={13} className="mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  {defaultProfileCount > 0 ? (
                    <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                      This category drives {defaultProfileCount} user
                      {defaultProfileCount === 1 ? '' : 's'} default template
                      {defaultProfileCount === 1 ? '' : 's'}.
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-16 text-center">
          <p className="text-sm font-medium text-[var(--foreground)]">
            No categories yet
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Add categories to organize invoices by type of work.
          </p>
          <Button size="sm" className="mt-4" onClick={openCreateInspector}>
            <Plus size={14} className="mr-1.5" />
            Add Category
          </Button>
        </div>
      )}

      <Drawer
        direction="right"
        open={inspectorOpen}
        onOpenChange={(open) => {
          if (!open) closeInspector()
        }}
      >
        <DrawerContent className="!duration-0 !transition-none [&[data-vaul-drawer-direction=right]]:!translate-x-0 sm:max-w-[28rem]">
          <DrawerHeader className="border-b border-[var(--border)]">
            <DrawerTitle className="text-sm font-medium text-[var(--foreground)]">
              {inspectorMode === 'rename' ? 'Rename category' : 'Create category'}
            </DrawerTitle>
            <DrawerDescription className="text-xs text-[var(--muted-foreground)]">
              {inspectorMode === 'rename'
                ? 'Renaming adjusts this category for future invoices and reporting labels. Existing invoices keep their stored category label.'
                : 'Add an explicit taxonomy name so invoices are easier to classify and report on.'}
            </DrawerDescription>
          </DrawerHeader>

          <form
            onSubmit={(e) => void handleInspectorSubmit(e)}
            className="space-y-3 p-4"
          >
            <label
              htmlFor="category-name"
              className="text-xs font-medium text-[var(--foreground)]"
            >
              Category name
            </label>
            <input
              id="category-name"
              type="text"
              value={inspectorCategoryName}
              onChange={(e) => {
                setInspectorCategoryName(e.target.value)
                setInspectorError('')
              }}
              placeholder="e.g., Development, Support, Marketing"
              autoFocus
              className="focus-emerald w-full border-b border-[var(--border)]/80 bg-transparent px-0 py-1.5 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-foreground)]/55"
            />
            {inspectorError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {inspectorError}
              </p>
            )}

            <DialogFooter className="mt-1 flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInspectorOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inspectorSaving}
              >
                {inspectorSaving ? (
                  <>
                    <Loader2 size={13} className="mr-1.5 animate-spin" />
                    {inspectorMode === 'rename' ? 'Saving…' : 'Creating…'}
                  </>
                ) : (
                  <>
                    <Check size={13} className="mr-1.5" />
                    {inspectorMode === 'rename' ? 'Save changes' : 'Create category'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DrawerContent>
      </Drawer>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={closeDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `${deleteTarget.name} is used by ${deleteTarget.invoiceCount ?? 0} ${deleteTarget.invoiceCount === 1 ? 'invoice' : 'invoices'}.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <p className="px-4 text-sm text-[var(--muted-foreground)]">
              {deleteTarget.invoiceCount
                ? `Deleting it will leave ${deleteTarget.invoiceCount} ${deleteTarget.invoiceCount === 1 ? 'invoice' : 'invoices'} uncategorized. This action cannot be undone.`
                : 'This category is unused. You can restore it from the undo banner after deletion.'}
            </p>
          ) : null}
          <DialogFooter className="mt-1 flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => void closeDeleteDialog()}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 size={13} className="mr-1.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
