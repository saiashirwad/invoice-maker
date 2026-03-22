import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { requireAdmin } from '@/lib/route-auth'
import {
  approveInvoice,
  getInvoice,
  getProcessedInvoiceCounts,
  listAdminInvoices,
  listPendingInvoices,
  rejectInvoice,
} from '@/lib/invoice-fns'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { AdminLayout } from '@/components/AdminLayout'
import { formatCurrency } from '@/components/invoice/useInvoice'
import { EntityChip } from '@/components/admin/EntityChip'
import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  CircleCheck,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  X,
} from 'lucide-react'
import { formatInvoiceDate, getBillToName as getBillToNameShared } from '@/components/InvoiceRow'
import { InvoiceQuickView } from '@/components/InvoiceQuickView'
import { StatusBadge } from '@/components/StatusBadge'

export const Route = createFileRoute('/admin/')({
  beforeLoad: requireAdmin,
  loader: async () => {
    const [pending, allInvoices, counts] = await Promise.all([
      listPendingInvoices(),
      listAdminInvoices(),
      getProcessedInvoiceCounts(),
    ])

    return { pending, allInvoices, counts }
  },
  component: AdminPage,
})

type PendingInvoice = Awaited<ReturnType<typeof listPendingInvoices>>[number]
type InvoiceHistory = Awaited<ReturnType<typeof listAdminInvoices>>[number]
type InvoiceDetail = Awaited<ReturnType<typeof getInvoice>>

type TimelineItem = InvoiceDetail['timeline'][number]
type LineItem = InvoiceDetail['lineItems'][number]

const formatDate = formatInvoiceDate
const getBillToName = getBillToNameShared

function normalizeEntity(entityName?: string | null) {
  if (!entityName) return 'Unknown'
  return entityName.trim().toUpperCase()
}

function isSv(entityName?: string | null) {
  return normalizeEntity(entityName).startsWith('SV')
}

function groupEntities(invoices: PendingInvoice[]) {
  const order = ['SV', 'LP']

  const groups = new Map<string, PendingInvoice[]>()

  for (const invoice of invoices) {
    const key = normalizeEntity(invoice.entityName)
    const existing = groups.get(key)
    if (existing) existing.push(invoice)
    else groups.set(key, [invoice])
  }

  return [...groups.entries()]
    .map(([entityName, items]) => ({
      entityName,
      items: [...items].sort((a, b) => {
        return (
          new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime() ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      }),
    }))
    .sort((a, b) => {
      const ai = order.indexOf(a.entityName)
      const bi = order.indexOf(b.entityName)
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      }

      return a.entityName.localeCompare(b.entityName)
    })
}

function buildCurrencyTotals(invoices: PendingInvoice[]) {
  return invoices.reduce<Record<string, number>>((agg, inv) => {
    agg[inv.currencyCode] = (agg[inv.currencyCode] ?? 0) + inv.grandTotalCents
    return agg
  }, {})
}

function buildUserHistory(invoices: InvoiceHistory[]) {
  const map = new Map<string, InvoiceHistory[]>()

  for (const invoice of invoices.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
      new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
  )) {
    const group = map.get(invoice.userId)
    if (group) group.push(invoice)
    else map.set(invoice.userId, [invoice])
  }

  return map
}

function getPrevInvoice(
  invoice: PendingInvoice,
  userHistory: Map<string, InvoiceHistory[]>,
): InvoiceHistory | null {
  const invoices = userHistory.get(invoice.userId) ?? []
  const currentMs = new Date(invoice.createdAt).getTime()

  return (
    invoices.find(
      (item) =>
        item.id !== invoice.id &&
        new Date(item.createdAt).getTime() < currentMs,
    ) ?? null
  )
}

function agingDays(invoice: PendingInvoice) {
  const diff = Date.now() - new Date(invoice.createdAt).getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function getAnomalySignals(invoice: PendingInvoice, prev: InvoiceHistory | null) {
  const signals: string[] = []
  if (!prev) {
    signals.push('First pending invoice')
  }

  const age = agingDays(invoice)
  if (age > 14) {
    signals.push(`Aging ${age}d`)
  }

  if (prev && prev.grandTotalCents) {
    const prevAmount = prev.grandTotalCents
    const delta = Math.abs(invoice.grandTotalCents - prevAmount)
    if (delta > 0) {
      const pct = Math.round((delta / prevAmount) * 100)
      if (pct >= 20) {
        signals.push(`Amount swing ${pct}%`)
      }
    }
  }

  if (prev?.status === 'rejected') {
    signals.push('Rejection history')
  }

  if (
    invoice.totalTaxCents > 0 &&
    ((invoice.taxPercent !== null && invoice.taxPercent >= 15) ||
      (invoice.taxPercent === null && invoice.totalTaxCents > invoice.subtotalCents * 0.2))
  ) {
    signals.push('Tax flagged')
  }

  return signals
}

function formatMoney(totalCents: number, currencyCode: string) {
  return formatCurrency(totalCents / 100, currencyCode)
}

function sumByCurrency(invoices: PendingInvoice[]) {
  return Object.entries(buildCurrencyTotals(invoices)).map(([currency, total]) => {
    return {
      currency,
      total: formatMoney(total, currency),
    }
  })
}

function InvoiceRow({
  invoice,
  onSelect,
  onOpen,
  isSelected,
  isActive,
  signals,
  onAction,
  onToggle,
  onReject,
  rowRef,
  disabled,
}: {
  invoice: PendingInvoice
  onSelect: () => void
  onOpen: () => void
  onToggle: () => void
  onAction: () => Promise<void>
  onReject: () => Promise<void>
  isSelected: boolean
  isActive: boolean
  signals: string[]
  rowRef: (node: HTMLButtonElement | null) => void
  disabled: boolean
}) {
  const amount = formatMoney(invoice.grandTotalCents, invoice.currencyCode)
  const contractor = invoice.userName || getBillToName(invoice.billTo)

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={onOpen}
      className={`group grid w-full grid-cols-[auto_1.25fr_1.1fr_1fr_auto] items-center gap-4 border-b border-[var(--border)] px-3 py-3 text-left transition last:border-b-0 focus-visible:bg-[var(--accent)] focus-visible:outline-none lg:grid-cols-[auto_1.2fr_1fr_0.85fr_auto] ${
        isActive
          ? 'bg-[var(--secondary)]'
          : disabled
            ? 'opacity-70'
            : 'hover:bg-[var(--accent)]'
      }`}
    >
      <div className="w-5 shrink-0 text-right">
        <Checkbox
          checked={isSelected}
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
        />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--foreground)]">
            {contractor}
          </span>
          <span className="shrink-0 text-xs text-[var(--muted-foreground)]"># {invoice.invoiceNumber}</span>
          <span className="shrink-0">
            <EntityChip entity={invoice.entityName ?? 'Unknown'} className="text-[10px]" />
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
          {getBillToName(invoice.billTo)} · {formatDate(invoice.createdAt)}
        </p>
      </div>

      <div className="min-w-0 text-xs text-[var(--muted-foreground)]">
        <div className="truncate">
          Submitted {formatDate(invoice.invoiceDate)} · {invoice.category || 'Uncategorized'}
        </div>
        <div className="mt-1 text-xs text-[var(--muted-foreground)]">
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      <div className="min-w-0">
        {signals.length === 0 ? (
          <span className="inline-flex rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted-foreground)]">
            Clear
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {signals.slice(0, 2).map((signal) => (
              <span
                key={signal}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              >
                <AlertCircle size={11} strokeWidth={2.2} />
                {signal}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 text-right">
        <div className="text-sm font-medium tabular-nums text-[var(--foreground)]">
          {amount}
        </div>
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={(event) => {
              event.stopPropagation()
              void onAction()
            }}
            disabled={disabled}
          >
            {disabled ? <Loader2 size={12} className="animate-spin" /> : <CircleCheck size={12} />}
            <span>Approve</span>
          </Button>
          <button
            type="button"
            className="inline-flex h-6 items-center justify-center rounded-md border border-rose-200 px-2 text-[11px] font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950"
            onClick={(event) => {
              event.stopPropagation()
              void onReject()
            }}
            disabled={disabled}
            aria-label={`Reject ${invoice.invoiceNumber}`}
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </button>
  )
}

function SummaryBand({
  pending,
  pendingByCurrency,
  signalCounts,
  userCounts,
  hasAny,
}: {
  pending: PendingInvoice[]
  pendingByCurrency: ReturnType<typeof sumByCurrency>
  signalCounts: {
    first: number
    aging: number
    amountSwing: number
    rejectionHistory: number
    tax: number
  }
  userCounts: { sv: number; lp: number; unknown: number }
  hasAny: boolean
}) {
  const totalPending = pending.length

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/55 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            Review queue
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{totalPending} pending</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {hasAny
              ? 'Prioritize by anomaly and age signals before opening each invoice.'
              : 'Queue clear. The lane is waiting for submissions.'}
          </p>
        </div>

        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
          {pendingByCurrency.map((item) => (
            <div
              key={item.currency}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-2"
            >
              <p className="text-[10px] uppercase text-[var(--muted-foreground)]">{item.currency}</p>
              <p className="mt-1 text-sm font-medium tabular-nums text-[var(--foreground)]">
                {item.total}
              </p>
            </div>
          ))}

          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-2">
            <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Entity split</p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
              <span className="inline-flex items-center gap-1.5">
                <EntityChip entity="SV" /> {userCounts.sv}
              </span>
              <span className="mx-2 text-[var(--muted-foreground)]">•</span>
              <span className="inline-flex items-center gap-1.5">
                <EntityChip entity="LP" /> {userCounts.lp}
              </span>
            </p>
          </div>

          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-2">
            <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Anomaly snapshot</p>
            <p className="mt-1 text-xs text-[var(--foreground)]">
              <span className="inline-flex gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] dark:bg-amber-950/70">
                  {signalCounts.first} first
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] dark:bg-amber-950/70">
                  {signalCounts.aging} aging
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] dark:bg-amber-950/70">
                  {signalCounts.amountSwing} swing
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] dark:bg-amber-950/70">
                  {signalCounts.rejectionHistory} rejects
                </span>
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function InspectorSummary({
  invoice,
  invoiceDetail,
  prior,
  loading,
}: {
  invoice: PendingInvoice | null
  invoiceDetail: InvoiceDetail | null
  prior: InvoiceHistory | null
  loading: boolean
}) {
  const amount = invoice
    ? formatMoney(invoice.grandTotalCents, invoice.currencyCode)
    : '$0'
  const invoiceAmount = invoice ? formatMoney(invoice.subtotalCents, invoice.currencyCode) : '$0'
  const taxAmount = invoice ? formatMoney(invoice.totalTaxCents, invoice.currencyCode) : '$0'
  const previousAmount = prior
    ? formatMoney(prior.grandTotalCents, prior.currencyCode)
    : null

  if (!invoice) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
        <FileText size={16} className="mx-auto text-[var(--muted-foreground)]" />
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Select an invoice to open the inspector</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <InvoiceQuickView
        amount={amount}
        date={formatDate(invoice.createdAt)}
        fromEntity={invoice.companyDetails}
        toEntity={getBillToName(invoice.billTo)}
        amountExtra={
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck size={12} />
              {invoice.userName || invoice.userName === null
                ? invoice.userName
                : getBillToName(invoice.billTo)}
            </span>
            <span>{invoice.entityName || 'Unknown entity'}</span>
          </div>
        }
      >
        <div className="mt-3 rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs font-medium text-[var(--foreground)]">Summary</p>
          <div className="mt-2 grid gap-2 text-xs text-[var(--muted-foreground)] sm:grid-cols-2">
            <div>
              <span className="text-[10px] uppercase text-[var(--muted-foreground)]">Submitted</span>
              <div className="text-sm text-[var(--foreground)]">{formatDate(invoice.createdAt)}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[var(--muted-foreground)]">Invoice date</span>
              <div className="text-sm text-[var(--foreground)]">{formatDate(invoice.invoiceDate)}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[var(--muted-foreground)]">Subtotal</span>
              <div className="text-sm text-[var(--foreground)]">{invoiceAmount}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[var(--muted-foreground)]">Tax</span>
              <div className="text-sm text-[var(--foreground)]">
                {taxAmount}
                {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
              </div>
            </div>
            {previousAmount && (
              <div className="sm:col-span-2">
                <span className="text-[10px] uppercase text-[var(--muted-foreground)]">
                  Previous invoice
                </span>
                <div className="text-sm text-[var(--foreground)]">
                  {previousAmount} · {prior?.invoiceNumber}
                </div>
              </div>
            )}
          </div>
          {invoice.rejectionReason && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {invoice.rejectionReason}
          </div>
          )}
          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Loader2 size={14} className="animate-spin" />
              Loading full invoice details
            </div>
          ) : null}
        </div>
      </InvoiceQuickView>

      {loading ? null : (
        <>
          <div className="rounded-lg border border-[var(--border)] p-3">
            <p className="text-xs font-medium text-[var(--foreground)]">Line items</p>
            <div className="mt-2 space-y-1">
              {(invoiceDetail?.lineItems ?? []).length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)]">
                  No line items available.
                </p>
              ) : (
                invoiceDetail?.lineItems?.map((line: LineItem) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <p className="min-w-0 text-[var(--foreground)]">
                      <span className="font-medium">{line.description}</span>
                      <span className="text-[var(--muted-foreground)]"> · {line.quantity} ×</span>
                      <span className="ml-1 text-[var(--muted-foreground)]">
                        {formatMoney(line.unitCostCents, invoice.currencyCode)}
                      </span>
                    </p>
                    <p className="font-medium tabular-nums text-[var(--foreground)]">
                      {formatMoney(line.amountCents, invoice.currencyCode)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] p-3">
            <p className="text-xs font-medium text-[var(--foreground)]">Timeline</p>
            <div className="mt-2 space-y-2">
              {(invoiceDetail?.timeline ?? []).length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)]">
                  No activity yet.
                </p>
              ) : (
                invoiceDetail?.timeline?.map((entry: TimelineItem, index: number) => (
                  <div
                    key={`${entry.action}-${entry.createdAt}-${index}`}
                    className="flex items-start justify-between gap-2 text-xs"
                  >
                    <span className="text-[var(--foreground)] capitalize">
                      {entry.action}
                    </span>
                    <span className="text-[var(--muted-foreground)]">
                      {entry.actorName}
                      {entry.createdAt
                        ? ` · ${formatDate(entry.createdAt)}`
                        : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="rounded-lg border border-[var(--border)] p-3">
        <p className="text-xs font-medium text-[var(--foreground)]">Actions</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Use the pinned controls below for the current invoice.
        </p>
        <div className="mt-2 rounded-md bg-[var(--secondary)] p-2 text-xs text-[var(--muted-foreground)]">
          <p>
            Keep keyboard shortcut in mind: <strong>A</strong> approve / <strong>R</strong>{' '}
            reject / <strong>J</strong> / <strong>K</strong> navigate.
          </p>
          <Link
            to="/invoices/$id"
            params={{ id: invoice.id }}
            className="mt-2 inline-flex items-center gap-1.5 text-[var(--foreground)] hover:underline"
          >
            <ArrowLeftRight size={12} />
            Open full invoice
          </Link>
        </div>
      </div>
    </div>
  )
}

function AdminPage() {
  const { session } = Route.useRouteContext()
  const { pending, allInvoices, counts } = Route.useLoaderData()
  const router = useRouter()

  const pendingGroups = useMemo(() => groupEntities(pending), [pending])
  const orderedInvoices = useMemo(
    () => pendingGroups.flatMap((section) => section.items),
    [pendingGroups],
  )
  const orderedIds = orderedInvoices.map((invoice) => invoice.id)

  const entitySplit = useMemo(() => {
    return pending.reduce(
      (acc, inv) => {
        if (isSv(inv.entityName)) acc.sv += 1
        else if (normalizeEntity(inv.entityName) === 'LP') acc.lp += 1
        else acc.unknown += 1
        return acc
      },
      { sv: 0, lp: 0, unknown: 0 },
    )
  }, [pending])

  const currencySummary = useMemo(() => sumByCurrency(pending), [pending])
  const historyMap = useMemo(() => buildUserHistory(allInvoices), [allInvoices])

  const signalMap = useMemo(() => {
    const totals = {
      first: 0,
      aging: 0,
      amountSwing: 0,
      rejectionHistory: 0,
      tax: 0,
    }

    for (const invoice of pending) {
      const prev = getPrevInvoice(invoice, historyMap)
      const signals = getAnomalySignals(invoice, prev)

      if (!prev) totals.first += 1
      if (signals.some((signal) => signal.startsWith('Aging'))) totals.aging += 1
      if (signals.some((signal) => signal.startsWith('Amount swing'))) {
        totals.amountSwing += 1
      }
      if (signals.some((signal) => signal === 'Rejection history')) {
        totals.rejectionHistory += 1
      }
      if (signals.some((signal) => signal === 'Tax flagged')) {
        totals.tax += 1
      }
    }

    return { totals, signalsByInvoice: pending.map((invoice) => ({
      invoice,
      signals: getAnomalySignals(invoice, getPrevInvoice(invoice, historyMap)),
    })) }
  }, [historyMap, pending])

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    orderedIds[0] ?? null,
  )
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(orderedIds[0] ?? null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rowLoading, setRowLoading] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)
  const [inspectorRejectReason, setInspectorRejectReason] = useState('')
  const [showInspectorReject, setShowInspectorReject] = useState(false)
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [batchRejectLoading, setBatchRejectLoading] = useState(false)
  const [batchRejectReason, setBatchRejectReason] = useState('')
  const [batchActionBusy, setBatchActionBusy] = useState(false)

  const queueRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const selectedInvoice = useMemo(
    () => pending.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [pending, selectedInvoiceId],
  )

  const priorInvoice = useMemo(
    () => (selectedInvoice ? getPrevInvoice(selectedInvoice, historyMap) : null),
    [selectedInvoice, historyMap],
  )

  useEffect(() => {
    if (!session?.user) return
    if (orderedIds.length === 0) {
      setSelectedInvoiceId(null)
      setActiveInvoiceId(null)
      return
    }

    if (!selectedInvoiceId || !orderedIds.includes(selectedInvoiceId)) {
      setSelectedInvoiceId(orderedIds[0])
      setActiveInvoiceId(orderedIds[0])
    }
  }, [orderedIds, selectedInvoiceId, session?.user])

  useEffect(() => {
    let isMounted = true
    if (!selectedInvoice) {
      setInvoiceDetail(null)
      return
    }

    setDetailLoading(true)
    void getInvoice({ data: { id: selectedInvoice.id } })
      .then((details) => {
        if (isMounted) setInvoiceDetail(details)
      })
      .finally(() => {
        if (isMounted) setDetailLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedInvoice])

  useEffect(() => {
    if (orderedIds.length === 0) {
      setSelectedIds(new Set())
      return
    }

    setSelectedIds((prev) => {
      const next = new Set<string>()
      for (const id of prev) {
        if (orderedIds.includes(id)) {
          next.add(id)
        }
      }
      return next
    })
  }, [orderedIds])

  const signalByInvoice = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const { invoice, signals } of signalMap.signalsByInvoice) {
      map.set(invoice.id, signals)
    }
    return map
  }, [signalMap.signalsByInvoice])

  const updateSelection = useCallback((id: string) => {
    setSelectedInvoiceId((current) => (current === id ? current : id))
    setActiveInvoiceId(id)
    setShowInspectorReject(false)
    setInspectorRejectReason('')
  }, [])

  const setRowElementRef = useCallback((id: string, node: HTMLButtonElement | null) => {
    rowRefs.current[id] = node
  }, [])

  const moveFocus = useCallback((nextId: string | null) => {
    if (!nextId) return
    setActiveInvoiceId(nextId)
    setSelectedInvoiceId(nextId)

    const node = rowRefs.current[nextId]
    if (node) {
      node.focus()
      node.scrollIntoView({ block: 'nearest' })
    }
  }, [])

  const nextInvoiceId = useCallback(
    (currentId: string) => {
      const index = orderedIds.indexOf(currentId)
      if (index === -1) return orderedIds[0] ?? null
      return orderedIds[index + 1] ?? null
    },
    [orderedIds],
  )

  const withRowLoading = (id: string, fn: () => Promise<void>) => {
    return async () => {
      if (rowLoading.has(id)) return
      setRowLoading((prev) => new Set(prev).add(id))
      try {
        await fn()
      } finally {
        setRowLoading((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    }
  }

  const decide = async (
    invoice: PendingInvoice,
    action: 'approve' | 'reject',
    reason?: string,
  ) => {
    if (rowLoading.has(invoice.id)) return
    setRowLoading((prev) => new Set(prev).add(invoice.id))

    try {
      if (action === 'approve') {
        await approveInvoice({ data: { id: invoice.id } })
      } else {
        await rejectInvoice({ data: { id: invoice.id, reason }})
      }

      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(invoice.id)
        return next
      })

      const next = nextInvoiceId(invoice.id)
      setSelectedInvoiceId(next)
      setActiveInvoiceId(next)
      await router.invalidate()
    } catch {
      // keep focus and selected state on failure
      setActiveInvoiceId(invoice.id)
      setSelectedInvoiceId(invoice.id)
    } finally {
      setRowLoading((prev) => {
        const next = new Set(prev)
        next.delete(invoice.id)
        return next
      })
    }
  }

  const handleApprove = useCallback(async (invoice: PendingInvoice) => {
    await decide(invoice, 'approve')
  }, [decide])

  const handleReject = useCallback(async (invoice: PendingInvoice, reason?: string) => {
    await decide(invoice, 'reject', reason)
  }, [decide])

  const handleBatchApprove = async () => {
    const selected = [...selectedIds]
    if (selected.length === 0) return
    setBatchLoading(true)
    setBatchActionBusy(true)

    try {
      for (const id of selected) {
        await approveInvoice({ data: { id } })
      }
      setSelectedIds(new Set())

      const idsAfter = orderedIds.filter((id) => !selected.includes(id))
      setSelectedInvoiceId(idsAfter[0] ?? null)
      setActiveInvoiceId(idsAfter[0] ?? null)
      await router.invalidate()
    } finally {
      setBatchLoading(false)
      setBatchActionBusy(false)
    }
  }

  const handleBatchReject = async () => {
    const selected = [...selectedIds]
    if (selected.length === 0) return
    setBatchRejectLoading(true)
    setBatchActionBusy(true)

    try {
      for (const id of selected) {
        await rejectInvoice({
          data: {
            id,
            reason: batchRejectReason.trim() || undefined,
          },
        })
      }
      setSelectedIds(new Set())
      setBatchRejectReason('')
      const idsAfter = orderedIds.filter((id) => !selected.includes(id))
      setSelectedInvoiceId(idsAfter[0] ?? null)
      setActiveInvoiceId(idsAfter[0] ?? null)
      await router.invalidate()
    } finally {
      setBatchRejectLoading(false)
      setBatchActionBusy(false)
    }
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    const all = new Set(selectedIds)
    if (selectedIds.size === orderedIds.length) {
      setSelectedIds(new Set())
      return
    }
    for (const id of orderedIds) all.add(id)
    setSelectedIds(all)
  }, [orderedIds, selectedIds.size])

  const queueKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!activeInvoiceId || orderedIds.length === 0) return
      if ((event.target as HTMLElement).tagName === 'TEXTAREA') return
      if (['ArrowUp', 'ArrowDown', 'j', 'k', 'A', 'a', 'R', 'r', 'Enter', 'Space', ' '].includes(event.key)) {
        event.preventDefault()
      }

      const currentIndex = orderedIds.indexOf(activeInvoiceId)
      const moveBy = event.key === 'ArrowDown' || event.key === 'j'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'k'
          ? -1
          : 0

      if (moveBy !== 0) {
        const nextIndex =
          currentIndex + moveBy < 0
            ? 0
            : currentIndex + moveBy >= orderedIds.length
              ? orderedIds.length - 1
              : currentIndex + moveBy
        moveFocus(orderedIds[nextIndex])
        return
      }

      const invoice = pending.find((row) => row.id === activeInvoiceId)
      if (!invoice) return

      if (event.key === 'Enter') {
        updateSelection(activeInvoiceId)
        return
      }

      if (event.key === ' ' || event.key === 'Space') {
        toggleSelect(activeInvoiceId)
        return
      }

      if (event.key === 'A' || event.key === 'a') {
        void handleApprove(invoice)
        return
      }

      if (event.key === 'R' || event.key === 'r') {
        void handleReject(invoice, '')
        return
      }
    },
    [activeInvoiceId, orderedIds, pending, moveFocus, handleApprove, handleReject, toggleSelect, updateSelection],
  )

  const allSelected = selectedIds.size === orderedIds.length && orderedIds.length > 0

  const selectedCountValue = selectedIds.size

  return (
    <AdminLayout
      title="Review"
      pendingCount={pending.length}
      processedCount={counts.all}
      wideCanvas
      utility={
        <div className="text-xs text-[var(--muted-foreground)]">
          <span>Use keyboard: J/K navigate, A approve, R reject</span>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <SummaryBand
            pending={pending}
            pendingByCurrency={currencySummary}
            signalCounts={signalMap.totals}
            userCounts={entitySplit}
            hasAny={pending.length > 0}
          />

          <section className="mt-4 rounded-xl border border-[var(--border)]">
            <div className="border-b border-[var(--border)] bg-[var(--secondary)]/50 px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      orderedIds.length > 0 &&
                      allSelected
                    }
                    indeterminate={selectedIds.size > 0 && !allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="font-medium text-[var(--foreground)]">Queue ({orderedIds.length})</span>
                </div>
                <p className="text-[var(--muted-foreground)]">Sorted by entity, then recency</p>
              </div>
            </div>

            <div
              ref={queueRef}
              tabIndex={0}
              onKeyDown={queueKeyDown}
              className="scroll-area max-h-[68vh] overflow-auto focus:outline-none lg:max-h-[calc(100vh-18rem)]"
            >
              {orderedInvoices.length === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">
                  <p className="font-medium text-[var(--foreground)]">No invoices waiting</p>
                  <p className="mt-1">Pending queue is empty. New submissions will land here.</p>
                </div>
              ) : (
                <>
                  {pendingGroups.map((group) => (
                    <div key={group.entityName} className="border-b border-[var(--border)] last:border-b-0">
                      <div className="flex items-center justify-between px-3 py-2 text-xs">
                        <p className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                          <EntityChip entity={group.entityName} className="text-[10px]" />
                          {group.entityName}
                        </p>
                        <p className="text-[var(--muted-foreground)]">
                          {group.items.length} invoice{group.items.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      {group.items.map((invoice) => {
                        const signals = signalByInvoice.get(invoice.id) ?? []
                        const active = invoice.id === activeInvoiceId
                        const loading = rowLoading.has(invoice.id)

                        return (
                          <InvoiceRow
                            key={invoice.id}
                            invoice={invoice}
                            onSelect={() => toggleSelect(invoice.id)}
                            onOpen={() => {
                              updateSelection(invoice.id)
                            }}
                            isSelected={selectedIds.has(invoice.id)}
                            isActive={active}
                            signals={signals}
                            onAction={() => withRowLoading(invoice.id, () => handleApprove(invoice))()}
                            onToggle={() => toggleSelect(invoice.id)}
                            onReject={() => withRowLoading(invoice.id, () => handleReject(invoice))()}
                            rowRef={(node) => setRowElementRef(invoice.id, node)}
                            disabled={loading}
                          />
                        )
                      })}
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--background)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className="text-[var(--muted-foreground)]">
                  {selectedCountValue > 0
                    ? `${selectedCountValue} selected for batch`
                    : 'Select rows to enable batch actions'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedCountValue > 0 && (
                    <>
                      <Button
                        size="xs"
                        onClick={() => void handleBatchApprove()}
                        disabled={batchLoading || batchActionBusy}
                      >
                        {batchLoading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                        Approve selected
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => void handleBatchReject()}
                        disabled={batchRejectLoading || batchActionBusy}
                      >
                        {batchRejectLoading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <X size={12} />
                        )}
                        Reject selected
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {selectedCountValue > 0 ? (
                <label className="mt-2 block text-xs text-[var(--muted-foreground)]">
                  <span className="mb-1 block">Optional batch rejection reason</span>
                  <textarea
                    value={batchRejectReason}
                    onChange={(event) => setBatchRejectReason(event.target.value)}
                    placeholder="Optional reason applied to batch reject"
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    rows={2}
                  />
                </label>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="min-h-0 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-[var(--border)]">
            <div className="border-b border-[var(--border)] px-4 py-2.5">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Inspector
              </p>
            </div>
            <div className="p-3">
              <InspectorSummary
                invoice={selectedInvoice}
                invoiceDetail={invoiceDetail}
                prior={priorInvoice}
                loading={detailLoading}
              />

              <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-3">
                {selectedInvoice ? (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => {
                        if (!selectedInvoice) return
                        void handleApprove(selectedInvoice)
                      }}
                      disabled={selectedInvoice ? rowLoading.has(selectedInvoice.id) : true}
                    >
                      {selectedInvoice && rowLoading.has(selectedInvoice.id) ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Approve invoice
                    </Button>

                    {!showInspectorReject ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setShowInspectorReject(true)}
                        disabled={selectedInvoice ? rowLoading.has(selectedInvoice.id) : true}
                      >
                        <X size={14} />
                        Reject invoice
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={inspectorRejectReason}
                          onChange={(event) => setInspectorRejectReason(event.target.value)}
                          placeholder="Rejection reason (optional)"
                          rows={3}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setShowInspectorReject(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              if (selectedInvoice) {
                                void handleReject(selectedInvoice, inspectorRejectReason)
                              }
                              setShowInspectorReject(false)
                              setInspectorRejectReason('')
                            }}
                            disabled={
                              !!selectedInvoice && rowLoading.has(selectedInvoice.id)
                            }
                          >
                            Submit reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedInvoice?.userId ? (
                      <Link
                        to="/contractors/$userId"
                        params={{ userId: selectedInvoice.userId }}
                        className="block"
                      >
                        <Button
                          className="w-full"
                          variant="ghost"
                          size="sm"
                          onClick={(event) => event.preventDefault()}
                        >
                          <Clock3 size={12} />
                          View contractor
                        </Button>
                      </Link>
                    ) : null}

                    <Link
                      to="/invoices/$id"
                      params={{ id: selectedInvoice.id }}
                      className="block"
                    >
                      <Button className="w-full" variant="outline" size="sm">
                        <ExternalLink size={12} />
                        Open full invoice
                      </Button>
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  )
}
