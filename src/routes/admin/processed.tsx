import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { requireAdmin } from '@/lib/route-auth'
import {
  listProcessedInvoices,
  getProcessedInvoiceSummary,
  listContractors,
  listCategories,
  getInvoice,
} from '@/lib/invoice-fns'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
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
import { formatInvoiceDate, getBillToName } from '@/components/InvoiceRow'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  User,
  CalendarDays,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Tag,
  Loader2,
  X,
  CalendarRange,
  Search,
  ChevronsUpDown,
  FileText,
} from 'lucide-react'
import type { DateRange } from 'react-day-picker'

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

type FilterChip = {
  key: string
  label: string
  value: string
  onClear: () => void
}

const PERSISTED_PROCESSED_FILTERS = 'invoice-maker-processed-filters-v1'

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
    const filterPayload = {
      status: deps.status === 'all' ? undefined : deps.status,
      userId: deps.userId || undefined,
      category: deps.category || undefined,
      dateFrom: deps.dateFrom || undefined,
      dateTo: deps.dateTo || undefined,
      sortBy: deps.sortBy,
      sortDir: deps.sortDir,
    }

    const [processed, summary, contractors, categories] = await Promise.all([
      listProcessedInvoices({ data: filterPayload }),
      getProcessedInvoiceSummary({ data: filterPayload }),
      listContractors(),
      listCategories(),
    ])
    return { processed, summary, contractors, categories }
  },
  component: ProcessedPage,
})

type Invoice = Awaited<
  ReturnType<typeof listProcessedInvoices>
>['items'][number]
type InvoiceSummary = Awaited<ReturnType<typeof getProcessedInvoiceSummary>>
type Contractor = Awaited<ReturnType<typeof listContractors>>[number]
type Category = Awaited<ReturnType<typeof listCategories>>[number]

function toISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDefaultedFilters(): Omit<
  SearchParams,
  'status' | 'sortBy' | 'sortDir'
> & {
  status?: StatusFilter
  sortBy?: SortBy
  sortDir?: SortDir
} {
  return {
    status: 'all',
    userId: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortDir: 'desc',
  }
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFilterDateRange(from: string, to: string): string {
  if (!from && !to) return 'All dates'
  if (from && to) return `${formatDateShort(from)} – ${formatDateShort(to)}`
  if (from) return `From ${formatDateShort(from)}`
  return `Until ${formatDateShort(to)}`
}

function formatDateRangeLabel(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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
    if (range.from === dateFrom && range.to === dateTo) {
      return preset.key
    }
  }
  return null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatMoney(totalCents: number, currencyCode: string) {
  return formatCurrency(totalCents / 100, currencyCode)
}

function FilterPill({
  icon: Icon,
  label,
  value,
  onClear,
  children,
}: {
  icon: typeof Filter
  label: string
  value?: string
  onClear?: () => void
  children: React.ReactNode | ((close: () => void) => React.ReactNode)
}) {
  const [open, setOpen] = useState(false)
  const isActive = !!value
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            isActive
              ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]'
              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/30 hover:text-[var(--foreground)]'
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
              className="rounded-sm p-0.5 hover:bg-[var(--foreground)]/12"
            >
              <X size={11} />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto min-w-[220px] p-0"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {typeof children === 'function'
          ? children(() => setOpen(false))
          : children}
      </PopoverContent>
    </Popover>
  )
}

function StatusFilterPill({
  value,
  counts,
  onChange,
}: {
  value: StatusFilter
  counts: InvoiceSummary['statusCounts']
  onChange: (status: StatusFilter) => void
}) {
  const statusTabs = [
    { key: 'all' as const, label: 'All statuses' },
    { key: 'approved' as const, label: 'Approved' },
    { key: 'rejected' as const, label: 'Rejected' },
    { key: 'paid' as const, label: 'Paid' },
  ].filter((item) => item.key === 'all' || counts[item.key] > 0)

  return (
    <FilterPill
      icon={Filter}
      label="Status"
      value={
        value === 'all'
          ? undefined
          : `${value[0].toUpperCase()}${value.slice(1)}`
      }
      onClear={value === 'all' ? undefined : () => onChange('all')}
    >
      {(close) => (
        <div className="py-1">
          {statusTabs.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                onChange(item.key)
                close()
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--accent)]"
            >
              <span className="text-[var(--foreground)]">{item.label}</span>
              <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                {item.key !== 'all' && (
                  <span className="tabular-nums">{counts[item.key]}</span>
                )}
                {value === item.key && <Check size={13} />}
              </span>
            </button>
          ))}
        </div>
      )}
    </FilterPill>
  )
}

function UserFilterPill({
  value,
  contractors,
  onChange,
}: {
  value: string
  contractors: Contractor[]
  onChange: (userId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(-1)
  const normalizedQuery = query.toLowerCase()
  const filtered = query
    ? contractors.filter(
        (contractor) =>
          contractor.name.toLowerCase().includes(normalizedQuery) ||
          contractor.email.toLowerCase().includes(normalizedQuery),
      )
    : contractors
  const selected = contractors.find((contractor) => contractor.id === value)

  const items: Array<
    { type: 'all' } | { type: 'contractor'; contractor: Contractor }
  > = []
  if (value) items.push({ type: 'all' })
  for (const contractor of filtered)
    items.push({ type: 'contractor', contractor })

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((index) => Math.min(index + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && highlighted >= 0) {
      event.preventDefault()
      const item = items[highlighted]
      if (item.type === 'all') onChange('')
      else onChange(item.contractor.id)
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
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setHighlighted(-1)
              }}
              className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
              placeholder="Search contractors..."
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {value && (
              <button
                role="option"
                onClick={() => {
                  onChange('')
                  close()
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  highlighted === 0
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
            {filtered.length > 0 ? (
              filtered.map((contractor, index) => {
                const itemIndex = value ? index + 1 : index
                const isHighlighted = highlighted === itemIndex
                const isSelected = contractor.id === value
                return (
                  <button
                    key={contractor.id}
                    role="option"
                    onClick={() => {
                      onChange(contractor.id)
                      close()
                    }}
                    className={`flex w-full items-center justify-between gap-2.5 px-3 py-2 text-sm transition-colors ${
                      isHighlighted || isSelected
                        ? 'bg-[var(--accent)]'
                        : 'hover:bg-[var(--accent)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-[10px] font-semibold text-[var(--background)]">
                        {getInitials(contractor.name)}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="truncate text-[var(--foreground)]">
                          {contractor.name}
                        </div>
                        <div className="truncate text-xs text-[var(--muted-foreground)]">
                          {contractor.email}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-[var(--foreground)]" />
                    )}
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-[var(--muted-foreground)]">
                No contractors match
              </div>
            )}
          </div>
        </div>
      )}
    </FilterPill>
  )
}

function CategoryFilterPill({
  value,
  categories,
  onChange,
}: {
  value: string
  categories: Category[]
  onChange: (name: string) => void
}) {
  const selectedLabel = categories.find(
    (category) => category.name === value,
  )?.name

  return (
    <FilterPill
      icon={Tag}
      label="Category"
      value={selectedLabel}
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
          {categories.length > 0 ? (
            categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  onChange(category.name)
                  close()
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--accent)]"
              >
                <span className="text-[var(--foreground)]">
                  {category.name}
                </span>
                {value === category.name && (
                  <Check size={14} className="text-[var(--foreground)]" />
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-xs text-[var(--muted-foreground)]">
              No categories yet
            </div>
          )}
        </div>
      )}
    </FilterPill>
  )
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
  const selectedPreset = datePresets.find(
    (preset) => preset.key === activePreset,
  )?.label
  const value = hasValue
    ? (selectedPreset ??
      (dateFrom && dateTo
        ? `${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)}`
        : dateFrom
          ? `From ${formatDateShort(dateFrom)}`
          : `Until ${formatDateShort(dateTo)}`))
    : undefined

  const selectedRange: DateRange | undefined =
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
      value={value}
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
        <div className="min-w-[210px]">
          {showCalendar ? (
            <div className="p-2">
              <button
                onClick={() => setShowCalendar(false)}
                className="mb-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                ← Presets
              </button>
              <Calendar
                mode="range"
                selected={selectedRange}
                onSelect={(range) => {
                  if (!range) return
                  onChange(
                    range.from ? toISO(range.from) : '',
                    range.to ? toISO(range.to) : '',
                  )
                  if (range.from && range.to) {
                    close()
                  }
                }}
                numberOfMonths={1}
              />
            </div>
          ) : (
            <>
              <div className="py-1">
                {datePresets.map((preset) => {
                  const isActive = preset.key === activePreset
                  return (
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
                      {isActive && <Check size={14} />}
                    </button>
                  )
                })}
              </div>
              <div className="border-t border-[var(--border)]">
                <button
                  onClick={() => setShowCalendar(true)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--accent)]"
                >
                  <span className="text-[var(--foreground)]">Custom range</span>
                  {hasValue && !activePreset && <Check size={14} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </FilterPill>
  )
}

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
      <div className="py-1">
        {(Object.keys(sortLabels) as SortBy[]).map((sortValue) => {
          const isActive = sortBy === sortValue
          const DirIcon = sortDir === 'asc' ? ArrowUp : ArrowDown
          return (
            <button
              key={sortValue}
              onClick={() => {
                onChange(
                  sortValue,
                  isActive && sortDir === 'desc' ? 'asc' : 'desc',
                )
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--accent)] ${
                isActive
                  ? 'text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)]'
              }`}
            >
              <span>{sortLabels[sortValue]}</span>
              {isActive && (
                <DirIcon size={13} className="text-[var(--foreground)]" />
              )}
            </button>
          )
        })}
      </div>
    </FilterPill>
  )
}

function ActiveFilterChips({
  items,
  clearAll,
}: {
  items: FilterChip[]
  clearAll: () => void
}) {
  if (items.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--secondary)]/70 px-2.5 py-1 text-xs text-[var(--foreground)]"
        >
          <span className="text-[var(--muted-foreground)]">{item.label}:</span>
          <span className="max-w-[16rem] truncate">{item.value}</span>
          <button
            onClick={item.onClear}
            className="rounded-sm p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <button
        onClick={clearAll}
        className="text-xs text-[var(--muted-foreground)] underline underline-offset-2 hover:text-[var(--foreground)]"
      >
        Clear all
      </button>
    </div>
  )
}

function SummaryRail({ summary }: { summary: InvoiceSummary }) {
  const statusEntries = [
    {
      key: 'approved',
      label: 'Approved',
      value: summary.statusCounts.approved,
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: summary.statusCounts.rejected,
    },
    { key: 'paid', label: 'Paid', value: summary.statusCounts.paid },
  ]
  const currencyRows = summary.currencyTotals.map((entry) => ({
    label: `${entry.currencyCode} ${formatMoney(entry.totalCents, entry.currencyCode)}`,
    value: `${entry.count} ·`,
  }))
  const entityRows = summary.entityTotals
    .map((entry) => `${entry.entityName}: ${entry.count}`)
    .filter(Boolean)

  return (
    <section className="mt-4 bg-[var(--secondary)]/45 px-4 py-3 text-xs">
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            Statuses
          </p>
          <p className="tabular-nums text-[var(--foreground)]">
            <span className="font-medium">{summary.statusCounts.all}</span>{' '}
            total
            {' · '}
            {statusEntries.map((entry, i) => (
              <span key={entry.key}>
                {i > 0 && (
                  <span className="mx-1.5 text-[var(--muted-foreground)]">
                    ·
                  </span>
                )}
                <span className="font-medium">{entry.value}</span>{' '}
                <span className="text-[var(--muted-foreground)]">
                  {entry.label}
                </span>
              </span>
            ))}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            Totals
          </p>
          <div className="text-[var(--foreground)]">
            {currencyRows.length === 0
              ? 'No currency totals'
              : currencyRows.map((item) => (
                  <p key={item.label} className="font-medium tabular-nums">
                    {item.label}
                  </p>
                ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            Entity split
          </p>
          <p className="text-[var(--foreground)]">
            {entityRows.length === 0
              ? 'No entity totals'
              : entityRows.map((item, i) => (
                  <span key={item}>
                    {i > 0 && (
                      <span className="mx-1.5 text-[var(--muted-foreground)]">
                        ·
                      </span>
                    )}
                    <span className="font-medium">{item}</span>
                  </span>
                ))}
          </p>
        </div>
      </div>
    </section>
  )
}

const statusBorderColor: Record<string, string> = {
  approved: 'border-l-amber-400',
  rejected: 'border-l-rose-400',
  paid: 'border-l-violet-400',
}

type ColumnDef = {
  key: string
  label: string
  sortKey?: SortBy
  align?: 'right'
}

const columns: ColumnDef[] = [
  { key: 'invoice', label: 'Invoice' },
  { key: 'contractor', label: 'Contractor', sortKey: 'user' },
  { key: 'entity', label: 'Entity' },
  { key: 'category', label: 'Category' },
  { key: 'date', label: 'Invoice date', sortKey: 'date' },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Amount', sortKey: 'amount', align: 'right' },
]

function LedgerTable({
  items,
  onSelect,
  open,
  selectedId,
  loadMoreLabel,
  onLoadMore,
  loadingMore,
  showingText,
  sortBy,
  sortDir,
  onSort,
}: {
  items: Invoice[]
  onSelect: (invoice: Invoice) => void
  open: boolean
  selectedId: string | null
  loadMoreLabel: string
  onLoadMore: () => void
  loadingMore: boolean
  showingText: string
  sortBy: SortBy
  sortDir: SortDir
  onSort: (by: SortBy, dir: SortDir) => void
}) {
  function handleColumnSort(col: ColumnDef) {
    if (!col.sortKey) return
    const nextDir =
      sortBy === col.sortKey && sortDir === 'desc' ? 'asc' : 'desc'
    onSort(col.sortKey, nextDir)
  }

  return (
    <section className="mt-3 border border-[var(--border)] bg-[var(--background)]">
      <div className="max-h-[68vh] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <tr className="text-left text-[11px] tracking-wide text-[var(--muted-foreground)]">
              {columns.map((col) => {
                const isSortable = !!col.sortKey
                const isActive = sortBy === col.sortKey
                return (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 font-medium ${col.align === 'right' ? 'text-right' : ''} ${isSortable ? 'cursor-pointer select-none hover:text-[var(--foreground)]' : ''}`}
                    onClick={
                      isSortable ? () => handleColumnSort(col) : undefined
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isSortable &&
                        (isActive ? (
                          sortDir === 'asc' ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )
                        ) : (
                          <ChevronsUpDown
                            size={12}
                            className="opacity-0 group-hover:opacity-100"
                          />
                        ))}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-14 text-center text-sm text-[var(--muted-foreground)]"
                >
                  No invoices match this ledger filter.
                </td>
              </tr>
            ) : (
              items.map((invoice) => {
                const isSelected = invoice.id === selectedId
                const borderColor =
                  statusBorderColor[invoice.status] ?? 'border-l-transparent'
                return (
                  <tr
                    key={invoice.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(invoice)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelect(invoice)
                      }
                    }}
                    className={`cursor-pointer border-l-2 transition-colors hover:bg-[var(--secondary)] ${borderColor} ${
                      isSelected ? 'bg-[var(--secondary)]' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-xs font-medium tabular-nums text-[var(--foreground)]">
                      #{invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--foreground)]">
                      {invoice.userName || getBillToName(invoice.billTo)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                      {invoice.entityName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                      {invoice.category || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                      {formatInvoiceDate(invoice.invoiceDate)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-[var(--foreground)]">
                      {formatMoney(
                        invoice.grandTotalCents,
                        invoice.currencyCode,
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[var(--border)] px-4 py-3">
        <p className="text-xs text-[var(--muted-foreground)]">{showingText}</p>
        {open && (
          <button
            type="button"
            onClick={() => void onLoadMore()}
            disabled={loadingMore}
            className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                {loadMoreLabel}
              </>
            )}
          </button>
        )}
      </div>
    </section>
  )
}

type LineItem = {
  id: string
  description: string
  quantity: number
  unitCostCents: number
  amountCents: number
}

function DetailDrawer({
  invoice,
  onClose,
}: {
  invoice: Invoice | null
  onClose: () => void
}) {
  const [open, setOpen] = useState(false)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const isOpen = Boolean(invoice) && open

  useEffect(() => {
    setOpen(Boolean(invoice))
  }, [invoice])

  useEffect(() => {
    if (!invoice) {
      setLineItems([])
      return
    }
    let cancelled = false
    setLoadingDetail(true)
    getInvoice({ data: { id: invoice.id } })
      .then((full) => {
        if (cancelled) return
        setLineItems(
          (full.lineItems ?? []).map((li) => ({
            id: li.id,
            description: li.description,
            quantity: li.quantity,
            unitCostCents: li.unitCostCents,
            amountCents: li.amountCents,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setLineItems([])
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })
    return () => {
      cancelled = true
    }
  }, [invoice])

  return (
    <Drawer
      direction="right"
      open={Boolean(invoice) && isOpen}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      handleOnly
      noBodyStyles
    >
      <DrawerContent className="!duration-0 !transition-none [&[data-vaul-drawer-direction=right]]:!translate-x-0 sm:max-w-[28rem]">
        {invoice ? (
          <>
            <DrawerHeader className="border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-sm font-medium text-[var(--foreground)]">
                  #{invoice.invoiceNumber}
                </DrawerTitle>
                <StatusBadge status={invoice.status} />
              </div>
              <DrawerDescription className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span>{invoice.userName || getBillToName(invoice.billTo)}</span>
                <span>·</span>
                <span>{invoice.entityName ?? 'Unknown'}</span>
                <span>·</span>
                <span>{formatDateRangeLabel(invoice.createdAt)}</span>
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <InvoiceQuickView
                amount={formatMoney(
                  invoice.grandTotalCents,
                  invoice.currencyCode,
                )}
                date={formatInvoiceDate(invoice.invoiceDate)}
                fromEntity={invoice.companyDetails.split(/\\n|\n/)[0]}
                toEntity={getBillToName(invoice.billTo)}
                amountExtra={
                  invoice.totalTaxCents > 0 ? (
                    <div className="mt-1 text-right text-xs text-[var(--muted-foreground)]">
                      incl.{' '}
                      {formatMoney(invoice.totalTaxCents, invoice.currencyCode)}
                      {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
                    </div>
                  ) : null
                }
              />

              {/* Line items */}
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  <FileText size={11} />
                  Line items
                </p>
                {loadingDetail ? (
                  <div className="flex items-center gap-1.5 py-3 text-xs text-[var(--muted-foreground)]">
                    <Loader2 size={12} className="animate-spin" />
                    Loading…
                  </div>
                ) : lineItems.length > 0 ? (
                  <div className="space-y-1">
                    {lineItems.map((li) => (
                      <div
                        key={li.id}
                        className="flex items-start justify-between gap-2 rounded-md bg-[var(--muted)] px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[var(--foreground)]">
                            {li.description}
                          </p>
                          <p className="mt-0.5 text-[var(--muted-foreground)]">
                            {li.quantity} &times;{' '}
                            {formatMoney(li.unitCostCents, invoice.currencyCode)}
                          </p>
                        </div>
                        <span className="shrink-0 font-medium tabular-nums text-[var(--foreground)]">
                          {formatMoney(li.amountCents, invoice.currencyCode)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-xs text-[var(--muted-foreground)]">
                    No line items
                  </p>
                )}
              </div>

              {/* Tax breakdown */}
              {(invoice.subtotalCents > 0 || invoice.totalTaxCents > 0) && (
                <div className="mt-3 space-y-1 border-t border-[var(--border)] pt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">
                      Subtotal
                    </span>
                    <span className="tabular-nums text-[var(--foreground)]">
                      {formatMoney(
                        invoice.subtotalCents,
                        invoice.currencyCode,
                      )}
                    </span>
                  </div>
                  {invoice.totalTaxCents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted-foreground)]">
                        Tax{invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
                      </span>
                      <span className="tabular-nums text-[var(--foreground)]">
                        {formatMoney(
                          invoice.totalTaxCents,
                          invoice.currencyCode,
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span className="text-[var(--foreground)]">Total</span>
                    <span className="tabular-nums text-[var(--foreground)]">
                      {formatMoney(
                        invoice.grandTotalCents,
                        invoice.currencyCode,
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Rejection reason */}
              {invoice.rejectionReason && (
                <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs dark:border-rose-800 dark:bg-rose-950">
                  <p className="font-medium text-rose-700 dark:text-rose-300">
                    Rejection reason
                  </p>
                  <p className="mt-1 text-rose-600 dark:text-rose-400">
                    {invoice.rejectionReason}
                  </p>
                </div>
              )}

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--muted)] p-3 text-xs">
                  <p className="font-medium text-[var(--foreground)]">Notes</p>
                  <p className="mt-1 whitespace-pre-line text-[var(--muted-foreground)]">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2 border-t border-[var(--border)] p-4">
              <Link
                to="/invoices/$id"
                params={{ id: invoice.id }}
                className="block w-full"
              >
                <Button className="w-full">
                  <ExternalLink size={14} />
                  Open full invoice
                </Button>
              </Link>
              {invoice.userId && (
                <Link
                  to="/contractors/$userId"
                  params={{ userId: invoice.userId }}
                  className="block w-full"
                >
                  <Button variant="ghost" className="w-full" size="sm">
                    <Search size={12} />
                    View contractor
                  </Button>
                </Link>
              )}
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

function ProcessedPage() {
  const { processed, summary, contractors, categories } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const persistedRestored = useRef(false)

  const [invoices, setInvoices] = useState(processed.items)
  const [cursor, setCursor] = useState(processed.nextCursor)
  const [hasMore, setHasMore] = useState(processed.hasMore)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const filterDefaults = getDefaultedFilters()
    const isDefaultSearch =
      search.status === filterDefaults.status &&
      !search.userId &&
      !search.category &&
      !search.dateFrom &&
      !search.dateTo &&
      search.sortBy === filterDefaults.sortBy &&
      search.sortDir === filterDefaults.sortDir

    if (persistedRestored.current || !isDefaultSearch) {
      persistedRestored.current = true
      return
    }

    const raw = window.localStorage.getItem(PERSISTED_PROCESSED_FILTERS)
    if (!raw) {
      persistedRestored.current = true
      return
    }

    try {
      const parsed = JSON.parse(raw)
      const nextSearch: SearchParams = {
        status: (statusOptions.includes(parsed.status as StatusFilter)
          ? parsed.status
          : 'all') as StatusFilter,
        userId: typeof parsed.userId === 'string' ? parsed.userId : '',
        category: typeof parsed.category === 'string' ? parsed.category : '',
        dateFrom: typeof parsed.dateFrom === 'string' ? parsed.dateFrom : '',
        dateTo: typeof parsed.dateTo === 'string' ? parsed.dateTo : '',
        sortBy: (sortByOptions.includes(parsed.sortBy as SortBy)
          ? parsed.sortBy
          : 'date') as SortBy,
        sortDir: (sortDirOptions.includes(parsed.sortDir as SortDir)
          ? parsed.sortDir
          : 'desc') as SortDir,
      }
      const hasSavedFilter =
        nextSearch.status !== 'all' ||
        nextSearch.userId ||
        nextSearch.category ||
        nextSearch.dateFrom ||
        nextSearch.dateTo ||
        nextSearch.sortBy !== 'date' ||
        nextSearch.sortDir !== 'desc'

      if (hasSavedFilter) {
        persistedRestored.current = true
        void navigate({ search: nextSearch })
      } else {
        persistedRestored.current = true
      }
    } catch {
      persistedRestored.current = true
    }
  }, [navigate, search])

  useEffect(() => {
    setInvoices(processed.items)
    setCursor(processed.nextCursor)
    setHasMore(processed.hasMore)
    if (selected && !processed.items.find((inv) => inv.id === selected.id)) {
      setSelected(null)
    }
  }, [processed, selected])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PERSISTED_PROCESSED_FILTERS,
        JSON.stringify(search),
      )
    } catch {}
  }, [search])

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
          limit: undefined,
        },
      })
      setInvoices((prev) => [...prev, ...result.items])
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loadingMore, search])

  const updateSearch = useCallback(
    (patch: Partial<SearchParams>) => {
      void navigate({ search: { ...search, ...patch } })
    },
    [navigate, search],
  )

  const contractorById = useMemo(() => {
    const map = new Map<string, string>()
    for (const contractor of contractors)
      map.set(contractor.id, contractor.name)
    return map
  }, [contractors])

  const filterChips: FilterChip[] = useMemo(() => {
    const result: FilterChip[] = []

    if (search.status !== 'all') {
      result.push({
        key: 'status',
        label: 'Status',
        value: search.status[0].toUpperCase() + search.status.slice(1),
        onClear: () => updateSearch({ status: 'all' }),
      })
    }

    if (search.userId) {
      result.push({
        key: 'user',
        label: 'Contractor',
        value: contractorById.get(search.userId) ?? search.userId,
        onClear: () => updateSearch({ userId: '' }),
      })
    }

    if (search.category) {
      result.push({
        key: 'category',
        label: 'Category',
        value: search.category,
        onClear: () => updateSearch({ category: '' }),
      })
    }

    if (search.dateFrom || search.dateTo) {
      result.push({
        key: 'date',
        label: 'Date',
        value: formatFilterDateRange(search.dateFrom, search.dateTo),
        onClear: () => updateSearch({ dateFrom: '', dateTo: '' }),
      })
    }

    if (search.sortBy !== 'date' || search.sortDir !== 'desc') {
      result.push({
        key: 'sort',
        label: 'Sort',
        value: `${sortLabels[search.sortBy]} ${search.sortDir === 'asc' ? '↑' : '↓'}`,
        onClear: () => updateSearch({ sortBy: 'date', sortDir: 'desc' }),
      })
    }

    return result
  }, [search, contractorById, updateSearch])

  const hasActiveFilters = filterChips.length > 0
  const scopeText =
    summary.totalCount === 0
      ? 'No results'
      : `Showing ${Math.min(invoices.length, summary.totalCount)} of ${summary.totalCount} invoices`

  const loadMoreLabel =
    summary.totalCount > invoices.length
      ? `Load more (${summary.totalCount - invoices.length} remaining)`
      : 'Load more'

  const dateWindow = formatFilterDateRange(search.dateFrom, search.dateTo)

  return (
    <AdminLayout processedCount={summary.statusCounts.all}>
      <div className="space-y-4">
        <div className="rounded-lg bg-[var(--secondary)]/35 p-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Processed ledger
            </p>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--foreground)]">{scopeText}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Date window: {dateWindow}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusFilterPill
              value={search.status}
              counts={summary.statusCounts}
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
              onChange={(dateFrom, dateTo) =>
                updateSearch({ dateFrom, dateTo })
              }
            />
            <SortPill
              sortBy={search.sortBy}
              sortDir={search.sortDir}
              onChange={(sortBy, sortDir) => updateSearch({ sortBy, sortDir })}
            />
            <span className="mx-1 hidden h-5 w-px bg-[var(--border)] sm:block" />
            <button
              type="button"
              disabled
              title="Coming soon"
              className="ml-auto inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] opacity-50"
            >
              <CalendarRange size={12} />
              Export / views
            </button>
          </div>
          {hasActiveFilters && (
            <ActiveFilterChips
              items={filterChips}
              clearAll={() =>
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
            />
          )}
        </div>

        {hasActiveFilters && <SummaryRail summary={summary} />}

        <LedgerTable
          items={invoices}
          onSelect={(invoice) => {
            setSelected(invoice)
            setDrawerOpen(true)
          }}
          open={Boolean(invoices.length) && hasMore}
          selectedId={selected?.id ?? null}
          loadMoreLabel={loadMoreLabel}
          onLoadMore={() => void handleLoadMore()}
          loadingMore={loadingMore}
          showingText={scopeText}
          sortBy={search.sortBy}
          sortDir={search.sortDir}
          onSort={(sortBy, sortDir) => updateSearch({ sortBy, sortDir })}
        />
      </div>

      <DetailDrawer
        invoice={drawerOpen ? selected : null}
        onClose={() => setDrawerOpen(false)}
      />
    </AdminLayout>
  )
}
