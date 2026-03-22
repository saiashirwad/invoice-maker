import { useState, useCallback, useEffect } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { requireAdmin } from '@/lib/route-auth'
import {
  listProcessedInvoices,
  getProcessedInvoiceCounts,
  listContractors,
  listCategories,
} from '@/lib/invoice-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { formatCurrency } from '@/components/invoice/useInvoice'
import { StatusBadge } from '@/components/StatusBadge'
import { InvoiceQuickView } from '@/components/InvoiceQuickView'
import { AdminLayout } from '@/components/AdminLayout'
import {
  InvoiceRow,
  invoiceRowClass,
  formatInvoiceDate,
  getBillToName,
} from '@/components/InvoiceRow'
import {
  ChevronDown,
  ExternalLink,
  Loader2,
  Filter,
  X,
  User,
  CalendarDays,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Tag,
} from 'lucide-react'
import type { DateRange } from 'react-day-picker'

// ─── Search params ────────────────────────────────────────────────

const statusOptions = ['all', 'approved', 'rejected', 'paid'] as const
type StatusFilter = (typeof statusOptions)[number]
const sortByOptions = ['date', 'amount', 'user'] as const
type SortBy = (typeof sortByOptions)[number]
const sortDirOptions = ['desc', 'asc'] as const
type SortDir = (typeof sortDirOptions)[number]

type SearchParams = {
  status: StatusFilter
  userId: string
  category: string
  dateFrom: string
  dateTo: string
  sortBy: SortBy
  sortDir: SortDir
}

export const Route = createFileRoute('/admin/processed')({
  beforeLoad: requireAdmin,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status: (statusOptions.includes(search.status as StatusFilter)
      ? search.status
      : 'all') as StatusFilter,
    userId: typeof search.userId === 'string' ? search.userId : '',
    category: typeof search.category === 'string' ? search.category : '',
    dateFrom: typeof search.dateFrom === 'string' ? search.dateFrom : '',
    dateTo: typeof search.dateTo === 'string' ? search.dateTo : '',
    sortBy: (sortByOptions.includes(search.sortBy as SortBy)
      ? search.sortBy
      : 'date') as SortBy,
    sortDir: (sortDirOptions.includes(search.sortDir as SortDir)
      ? search.sortDir
      : 'desc') as SortDir,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [processed, counts, contractors, categories] = await Promise.all([
      listProcessedInvoices({
        data: {
          status: deps.status === 'all' ? undefined : deps.status,
          userId: deps.userId || undefined,
          category: deps.category || undefined,
          dateFrom: deps.dateFrom || undefined,
          dateTo: deps.dateTo || undefined,
          sortBy: deps.sortBy,
          sortDir: deps.sortDir,
        },
      }),
      getProcessedInvoiceCounts(),
      listContractors(),
      listCategories(),
    ])
    return { processed, counts, contractors, categories }
  },
  component: ProcessedPage,
})

type Invoice = Awaited<
  ReturnType<typeof listProcessedInvoices>
>['items'][number]
type Contractor = Awaited<ReturnType<typeof listContractors>>[number]

// ─── Filter Pill ──────────────────────────────────────────────────

function FilterPill({
  icon: Icon,
  label,
  value,
  onClear,
  closeOnSelect,
  children,
}: {
  icon: typeof Filter
  label: string
  value?: string
  onClear?: () => void
  closeOnSelect?: boolean
  children: React.ReactNode | ((close: () => void) => React.ReactNode)
}) {
  const [open, setOpen] = useState(false)
  const isActive = !!value
  const close = useCallback(() => setOpen(false), [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            isActive
              ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]'
              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/20 hover:text-[var(--foreground)]'
          }`}
        >
          <Icon size={13} />
          {value || label}
          {isActive && onClear && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              className="ml-0.5 rounded-sm p-0.5 hover:bg-[var(--foreground)]/10"
            >
              <X size={11} />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto min-w-[200px] p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {typeof children === 'function' ? children(close) : children}
      </PopoverContent>
    </Popover>
  )
}

// ─── Status Filter ────────────────────────────────────────────────

function StatusFilterPill({
  value,
  counts,
  onChange,
}: {
  value: StatusFilter
  counts: Record<string, number>
  onChange: (v: StatusFilter) => void
}) {
  const statusDots: Record<string, string> = {
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    paid: 'bg-violet-500',
  }

  const tabs = [
    { key: 'all' as const, label: 'All statuses' },
    { key: 'approved' as const, label: 'Approved' },
    { key: 'rejected' as const, label: 'Rejected' },
    { key: 'paid' as const, label: 'Paid' },
  ].filter((t) => t.key === 'all' || (counts[t.key] ?? 0) > 0)

  return (
    <FilterPill
      icon={Filter}
      label="Status"
      value={
        value !== 'all'
          ? value.charAt(0).toUpperCase() + value.slice(1)
          : undefined
      }
      onClear={value !== 'all' ? () => onChange('all') : undefined}
    >
      {(close) => (
        <div className="py-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                onChange(tab.key)
                close()
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--accent)]"
            >
              <div className="flex items-center gap-2.5">
                {tab.key !== 'all' && (
                  <span
                    className={`h-2 w-2 rounded-full ${statusDots[tab.key]}`}
                  />
                )}
                <span className="text-[var(--foreground)]">{tab.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-[var(--muted-foreground)]">
                  {counts[tab.key] ?? 0}
                </span>
                {value === tab.key && (
                  <Check size={14} className="text-[var(--foreground)]" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </FilterPill>
  )
}

// ─── User Filter ──────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function UserFilterPill({
  value,
  contractors,
  onChange,
}: {
  value: string
  contractors: Contractor[]
  onChange: (v: string) => void
}) {
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const selected = contractors.find((c) => c.id === value)
  const lowerQuery = query.toLowerCase()
  const filtered = query
    ? contractors.filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.email.toLowerCase().includes(lowerQuery),
      )
    : contractors

  // Build flat list: optional "All" + filtered contractors
  const allItems: Array<
    { type: 'all' } | { type: 'contractor'; c: Contractor }
  > = []
  if (value) allItems.push({ type: 'all' })
  for (const c of filtered) allItems.push({ type: 'contractor', c })

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault()
      const item = allItems[highlightedIndex]
      if (item.type === 'all') onChange('')
      else onChange(item.c.id)
      close()
    }
  }

  return (
    <FilterPill
      icon={User}
      label="Contractor"
      value={selected?.name}
      onClear={value ? () => onChange('') : undefined}
    >
      {(close) => (
        <div onKeyDown={handleKeyDown}>
          <div className="border-b border-[var(--border)] px-3 py-2.5">
            <input
              type="text"
              placeholder="Search contractors..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setHighlightedIndex(-1)
              }}
              className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
              autoFocus
            />
          </div>
          <div
            className="max-h-72 overflow-y-auto py-1"
            role="listbox"
            aria-label="Contractors"
          >
            {value && (
              <button
                role="option"
                aria-selected={false}
                onClick={() => {
                  onChange('')
                  close()
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  highlightedIndex === 0
                    ? 'bg-[var(--accent)]'
                    : 'hover:bg-[var(--accent)]'
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--border)]">
                  <User size={12} className="text-[var(--muted-foreground)]" />
                </div>
                <span className="text-[var(--muted-foreground)]">
                  All contractors
                </span>
              </button>
            )}
            {filtered.map((c, i) => {
              const itemIndex = value ? i + 1 : i
              const isHighlighted = highlightedIndex === itemIndex
              const isSelected = value === c.id

              return (
                <button
                  key={c.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(c.id)
                    close()
                  }}
                  className={`flex w-full items-center justify-between gap-2.5 px-3 py-2 text-sm transition-colors ${
                    isHighlighted
                      ? 'bg-[var(--accent)]'
                      : 'hover:bg-[var(--accent)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-[10px] font-semibold text-[var(--background)]">
                      {getInitials(c.name)}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="truncate text-[var(--foreground)]">
                        {c.name}
                      </div>
                      <div className="truncate text-xs text-[var(--muted-foreground)]">
                        {c.email}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check
                      size={14}
                      className="shrink-0 text-[var(--foreground)]"
                    />
                  )}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-[var(--muted-foreground)]">
                No contractors found
              </div>
            )}
          </div>
        </div>
      )}
    </FilterPill>
  )
}

// ─── Category Filter ──────────────────────────────────────────────

type Category = { id: string; name: string }

function CategoryFilterPill({
  value,
  categories,
  onChange,
}: {
  value: string
  categories: Category[]
  onChange: (v: string) => void
}) {
  const selectedName = categories.find((c) => c.name === value)?.name

  return (
    <FilterPill
      icon={Tag}
      label="Category"
      value={selectedName}
      onClear={value ? () => onChange('') : undefined}
    >
      {(close) => (
        <div className="py-1">
          {value && (
            <button
              onClick={() => {
                onChange('')
                close()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)]"
            >
              All categories
            </button>
          )}
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                onChange(cat.name)
                close()
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--accent)]"
            >
              <span className="text-[var(--foreground)]">{cat.name}</span>
              {value === cat.name && (
                <Check size={14} className="text-[var(--foreground)]" />
              )}
            </button>
          ))}
          {categories.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-[var(--muted-foreground)]">
              No categories yet
            </div>
          )}
        </div>
      )}
    </FilterPill>
  )
}

// ─── Date Range Filter ────────────────────────────────────────────

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getPresetRange(key: string): {
  from: string
  to: string
  label: string
} {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const to = toISO(today)

  switch (key) {
    case 'week': {
      const d = new Date(today)
      d.setDate(d.getDate() - 7)
      return { from: toISO(d), to, label: 'Last 7 days' }
    }
    case 'fortnight': {
      const d = new Date(today)
      d.setDate(d.getDate() - 14)
      return { from: toISO(d), to, label: 'Last 14 days' }
    }
    case 'month': {
      const d = new Date(today)
      d.setMonth(d.getMonth() - 1)
      return { from: toISO(d), to, label: 'Last 30 days' }
    }
    case 'quarter': {
      const d = new Date(today)
      d.setMonth(d.getMonth() - 3)
      return { from: toISO(d), to, label: 'Last 3 months' }
    }
    case 'year': {
      const d = new Date(today)
      d.setFullYear(d.getFullYear() - 1)
      return { from: toISO(d), to, label: 'Last 12 months' }
    }
    default:
      return { from: '', to: '', label: '' }
  }
}

const datePresets = [
  { key: 'week', label: 'Last 7 days' },
  { key: 'fortnight', label: 'Last 14 days' },
  { key: 'month', label: 'Last 30 days' },
  { key: 'quarter', label: 'Last 3 months' },
  { key: 'year', label: 'Last 12 months' },
]

function matchesPreset(dateFrom: string, dateTo: string): string | null {
  for (const preset of datePresets) {
    const range = getPresetRange(preset.key)
    if (range.from === dateFrom && range.to === dateTo) return preset.key
  }
  return null
}

function DateFilterPill({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string
  dateTo: string
  onChange: (from: string, to: string) => void
}) {
  const [showCalendar, setShowCalendar] = useState(false)
  const hasValue = !!(dateFrom || dateTo)
  const activePreset = hasValue ? matchesPreset(dateFrom, dateTo) : null

  const displayValue = hasValue
    ? activePreset
      ? datePresets.find((p) => p.key === activePreset)?.label
      : dateFrom && dateTo
        ? `${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)}`
        : dateFrom
          ? `From ${formatDateShort(dateFrom)}`
          : `Until ${formatDateShort(dateTo)}`
    : undefined

  const selected: DateRange | undefined =
    dateFrom || dateTo
      ? {
          from: dateFrom ? new Date(dateFrom + 'T00:00:00') : undefined,
          to: dateTo ? new Date(dateTo + 'T00:00:00') : undefined,
        }
      : undefined

  return (
    <FilterPill
      icon={CalendarDays}
      label="Date"
      value={displayValue}
      onClear={
        hasValue
          ? () => {
              onChange('', '')
              setShowCalendar(false)
            }
          : undefined
      }
    >
      {(close) => (
        <div className="min-w-[200px]">
          {showCalendar ? (
            <div className="p-2">
              <button
                onClick={() => setShowCalendar(false)}
                className="mb-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                &larr; Presets
              </button>
              <Calendar
                mode="range"
                selected={selected}
                onSelect={(range) => {
                  const from = range?.from ? toISO(range.from) : ''
                  const to = range?.to ? toISO(range.to) : ''
                  onChange(from, to)
                }}
                numberOfMonths={1}
              />
            </div>
          ) : (
            <>
              <div className="py-1">
                {datePresets.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => {
                      const range = getPresetRange(preset.key)
                      onChange(range.from, range.to)
                      setShowCalendar(false)
                      close()
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--accent)]"
                  >
                    <span className="text-[var(--foreground)]">
                      {preset.label}
                    </span>
                    {activePreset === preset.key && (
                      <Check size={14} className="text-[var(--foreground)]" />
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-[var(--border)]">
                <button
                  onClick={() => setShowCalendar(true)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--accent)]"
                >
                  <span className="text-[var(--foreground)]">Custom range</span>
                  {hasValue && !activePreset && (
                    <Check size={14} className="text-[var(--foreground)]" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </FilterPill>
  )
}

// ─── Sort Pill ────────────────────────────────────────────────────

const sortLabels: Record<SortBy, string> = {
  date: 'Date',
  amount: 'Amount',
  user: 'Contractor',
}

function SortPill({
  sortBy,
  sortDir,
  onChange,
}: {
  sortBy: SortBy
  sortDir: SortDir
  onChange: (by: SortBy, dir: SortDir) => void
}) {
  const isDefault = sortBy === 'date' && sortDir === 'desc'

  return (
    <FilterPill
      icon={ArrowUpDown}
      label="Sort"
      value={
        !isDefault
          ? `${sortLabels[sortBy]} ${sortDir === 'asc' ? '↑' : '↓'}`
          : undefined
      }
      onClear={!isDefault ? () => onChange('date', 'desc') : undefined}
    >
      {(close) => (
        <div className="py-1">
          {(Object.keys(sortLabels) as SortBy[]).map((key) => {
            const isActive = sortBy === key
            const DirIcon = sortDir === 'asc' ? ArrowUp : ArrowDown

            return (
              <button
                key={key}
                onClick={() => {
                  onChange(key, isActive && sortDir === 'desc' ? 'asc' : 'desc')
                  close()
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--accent)] ${
                  isActive
                    ? 'text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)]'
                }`}
              >
                <span>{sortLabels[key]}</span>
                {isActive && (
                  <DirIcon size={13} className="text-[var(--foreground)]" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </FilterPill>
  )
}

// ─── Detail Dialog ────────────────────────────────────────────────

function DetailDialog({
  inv,
  open,
  onOpenChange,
}: {
  inv: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!inv) return null

  const amount = formatCurrency(inv.grandTotalCents / 100, inv.currencyCode)
  const isRejected = inv.status === 'rejected'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            #{inv.invoiceNumber}
            <StatusBadge status={inv.status} />
          </DialogTitle>
          <DialogDescription>
            {inv.userName && (
              <>
                <Link
                  to="/contractors/$userId"
                  params={{ userId: inv.userId }}
                  className="underline decoration-[var(--muted-foreground)]/40 underline-offset-2 hover:text-[var(--foreground)] hover:decoration-[var(--foreground)]/60"
                >
                  {inv.userName}
                </Link>{' '}
                &middot;{' '}
              </>
            )}
            {getBillToName(inv.billTo)}
          </DialogDescription>
        </DialogHeader>

        <InvoiceQuickView
          amount={amount}
          date={formatInvoiceDate(inv.invoiceDate)}
          fromEntity={inv.companyDetails.split(/\\n|\n/)[0]}
          toEntity={getBillToName(inv.billTo)}
          amountExtra={
            inv.totalTaxCents > 0 ? (
              <div className="mt-1 text-right text-xs text-[var(--muted-foreground)]">
                incl.{' '}
                {formatCurrency(inv.totalTaxCents / 100, inv.currencyCode)} tax
                {inv.taxPercent ? ` (${inv.taxPercent}%)` : ''}
              </div>
            ) : undefined
          }
        />

        {isRejected && inv.rejectionReason && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-900 dark:bg-red-950">
            <div className="text-[11px] font-medium text-red-600 dark:text-red-400">
              Rejection Reason
            </div>
            <div className="mt-1 text-red-900 dark:text-red-200">
              {inv.rejectionReason}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-col">
          <Link to="/invoices/$id" params={{ id: inv.id }} className="w-full">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[var(--muted-foreground)]"
            >
              <ExternalLink size={14} className="mr-1.5" />
              View full invoice
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────

function ProcessedPage() {
  const { processed, counts, contractors, categories } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const [items, setItems] = useState(processed.items)
  const [cursor, setCursor] = useState(processed.nextCursor)
  const [hasMore, setHasMore] = useState(processed.hasMore)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<Invoice | null>(null)

  // Reset client state when loader re-runs (any filter changed)
  useEffect(() => {
    setItems(processed.items)
    setCursor(processed.nextCursor)
    setHasMore(processed.hasMore)
  }, [processed])

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const result = await listProcessedInvoices({
        data: {
          status: search.status === 'all' ? undefined : search.status,
          userId: search.userId || undefined,
          category: search.category || undefined,
          dateFrom: search.dateFrom || undefined,
          dateTo: search.dateTo || undefined,
          sortBy: search.sortBy,
          sortDir: search.sortDir,
          cursor,
        },
      })
      setItems((prev) => [...prev, ...result.items])
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loadingMore, search])

  function updateSearch(patch: Partial<SearchParams>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) })
  }

  const activeFilters = [
    search.status !== 'all' && 'status',
    search.userId && 'user',
    search.category && 'category',
    (search.dateFrom || search.dateTo) && 'date',
  ].filter(Boolean).length
  const showClearAll = activeFilters > 1
  const isFiltered =
    activeFilters > 0 || search.sortBy !== 'date' || search.sortDir !== 'desc'

  // Compute summary for visible items
  const totalAmount = items.reduce((s, inv) => s + inv.grandTotalCents, 0)
  const primaryCurrency = items[0]?.currencyCode ?? 'USD'

  // When filtering by contractor, show entity instead of redundant name
  const filteredByUser = !!search.userId
  const filteredUserName = contractors.find((c) => c.id === search.userId)?.name

  return (
    <AdminLayout processedCount={counts.all}>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusFilterPill
          value={search.status}
          counts={counts}
          onChange={(status) => updateSearch({ status })}
        />
        <UserFilterPill
          value={search.userId}
          contractors={contractors}
          onChange={(userId) => updateSearch({ userId })}
        />
        <CategoryFilterPill
          value={search.category}
          categories={categories}
          onChange={(category) => updateSearch({ category })}
        />
        <DateFilterPill
          dateFrom={search.dateFrom}
          dateTo={search.dateTo}
          onChange={(dateFrom, dateTo) => updateSearch({ dateFrom, dateTo })}
        />
        <SortPill
          sortBy={search.sortBy}
          sortDir={search.sortDir}
          onChange={(sortBy, sortDir) => updateSearch({ sortBy, sortDir })}
        />
        {showClearAll && (
          <button
            onClick={() =>
              updateSearch({
                status: 'all',
                userId: '',
                category: '',
                dateFrom: '',
                dateTo: '',
                sortBy: 'date',
                sortDir: 'desc',
              })
            }
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Result summary */}
      {items.length > 0 && (
        <div className="mb-5 flex items-baseline justify-between text-xs text-[var(--muted-foreground)]">
          <span>
            {items.length}
            {hasMore ? '+' : ''} invoice{items.length !== 1 ? 's' : ''}
            {filteredByUser && filteredUserName && <> by {filteredUserName}</>}
          </span>
          <span className="font-medium tabular-nums text-[var(--foreground)]">
            {formatCurrency(totalAmount / 100, primaryCurrency)}
          </span>
        </div>
      )}

      {/* Invoice list */}
      {items.length > 0 ? (
        <div>
          <div className="divide-y divide-[var(--border)]">
            {items.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSelected(inv)}
                className={invoiceRowClass}
              >
                <InvoiceRow
                  invoiceNumber={inv.invoiceNumber}
                  status={inv.status}
                  date={inv.invoiceDate}
                  entityName={
                    filteredByUser
                      ? getBillToName(inv.billTo)
                      : inv.userName
                        ? `by ${inv.userName}`
                        : getBillToName(inv.billTo)
                  }
                  entityBadge={inv.entityName ?? undefined}
                  amount={formatCurrency(
                    inv.grandTotalCents / 100,
                    inv.currencyCode,
                  )}
                />
              </button>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
              className="mt-4 flex w-full items-center justify-center gap-1.5 py-3 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ChevronDown size={14} />
              )}
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            No invoices match your filters
          </p>
          {activeFilters > 0 && (
            <button
              onClick={() =>
                updateSearch({
                  status: 'all',
                  userId: '',
                  category: '',
                  dateFrom: '',
                  dateTo: '',
                })
              }
              className="mt-2 text-xs text-[var(--muted-foreground)] underline underline-offset-2 hover:text-[var(--foreground)]"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <DetailDialog
        inv={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </AdminLayout>
  )
}
