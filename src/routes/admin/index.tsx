import type { KeyboardEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { AdminLayout } from '@/components/AdminLayout'
import { formatCurrency } from '@/components/invoice/useInvoice'
import { Check, Clock3, ExternalLink, Loader2, X } from 'lucide-react'
import {
  formatInvoiceDate,
  getBillToName as getBillToNameShared,
} from '@/components/InvoiceRow'

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
          new Date(b.invoiceDate).getTime() -
            new Date(a.invoiceDate).getTime() ||
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

function getAnomalySignals(
  invoice: PendingInvoice,
  prev: InvoiceHistory | null,
) {
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
      (invoice.taxPercent === null &&
        invoice.totalTaxCents > invoice.subtotalCents * 0.2))
  ) {
    signals.push('Tax flagged')
  }

  return signals
}

function formatMoney(totalCents: number, currencyCode: string) {
  return formatCurrency(totalCents / 100, currencyCode)
}

function sumByCurrency(invoices: PendingInvoice[]) {
  return Object.entries(buildCurrencyTotals(invoices)).map(
    ([currency, total]) => {
      return {
        currency,
        total: formatMoney(total, currency),
      }
    },
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
  const rejectCount = signalCounts.rejectionHistory

  const stats = [
    ...pendingByCurrency.map((item) => item.total),
    ...(userCounts.sv > 0 || userCounts.lp > 0
      ? [`SV ${userCounts.sv}`, `LP ${userCounts.lp}`]
      : []),
    ...(rejectCount > 0 ? [`${rejectCount} rejects`] : []),
  ]

  return (
    <section className="px-4 py-3">
      {hasAny ? (
        <div className="flex items-baseline gap-3">
          <span className="tabular-nums text-sm font-medium text-[var(--foreground)]">
            {totalPending} pending
          </span>
          <div className="flex items-baseline gap-1.5 text-xs tabular-nums text-[var(--muted-foreground)]">
            {stats.map((stat, i) => (
              <span key={i}>
                {i > 0 && <span className="mr-1.5 select-none">&middot;</span>}
                {stat}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          No invoices pending
        </p>
      )}
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
  if (!invoice) return null

  const amount = formatMoney(invoice.grandTotalCents, invoice.currencyCode)
  const subtotal = formatMoney(invoice.subtotalCents, invoice.currencyCode)
  const tax = formatMoney(invoice.totalTaxCents, invoice.currencyCode)
  const previousAmount = prior
    ? formatMoney(prior.grandTotalCents, prior.currencyCode)
    : null

  return (
    <div className="space-y-4">
      {/* Amount */}
      <div>
        <p className="text-xl font-semibold tabular-nums text-[var(--foreground)]">
          {amount}
        </p>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          {invoice.entityName || 'Unknown entity'} →{' '}
          {getBillToName(invoice.billTo)}
        </p>
      </div>

      {/* Key details */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--muted-foreground)]">Invoice date</span>
          <span className="text-[var(--foreground)]">
            {formatDate(invoice.invoiceDate)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted-foreground)]">Submitted</span>
          <span className="text-[var(--foreground)]">
            {formatDate(invoice.createdAt)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted-foreground)]">Subtotal</span>
          <span className="tabular-nums text-[var(--foreground)]">
            {subtotal}
          </span>
        </div>
        {invoice.totalTaxCents > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Tax</span>
            <span className="tabular-nums text-[var(--foreground)]">
              {tax}
              {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
            </span>
          </div>
        )}
        {previousAmount && (
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Previous</span>
            <span className="tabular-nums text-[var(--foreground)]">
              {previousAmount} · {prior?.invoiceNumber}
            </span>
          </div>
        )}
      </div>

      {invoice.rejectionReason && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {invoice.rejectionReason}
        </div>
      )}

      {/* Line items */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <Loader2 size={14} className="animate-spin" />
          Loading details…
        </div>
      ) : (
        <div className="border-t border-[var(--border)] pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Line items
          </p>
          <div className="mt-2 space-y-1.5">
            {(invoiceDetail?.lineItems ?? []).length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">
                No line items.
              </p>
            ) : (
              invoiceDetail?.lineItems.map((line: LineItem) => (
                <div
                  key={line.id}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <span className="min-w-0 text-[var(--foreground)]">
                    {line.description}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-[var(--foreground)]">
                    {formatMoney(line.amountCents, invoice.currencyCode)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
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
  const orderedIds = useMemo(
    () => orderedInvoices.map((invoice) => invoice.id),
    [orderedInvoices],
  )

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
      if (signals.some((signal) => signal.startsWith('Aging')))
        totals.aging += 1
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

    return {
      totals,
    }
  }, [historyMap, pending])

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  )
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null)
  const [rowLoading, setRowLoading] = useState<Set<string>>(new Set())
  const [inspectorRejectReason, setInspectorRejectReason] = useState('')
  const [showInspectorReject, setShowInspectorReject] = useState(false)
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const queueRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  const selectedInvoice = useMemo(
    () => pending.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [pending, selectedInvoiceId],
  )

  const priorInvoice = useMemo(
    () =>
      selectedInvoice ? getPrevInvoice(selectedInvoice, historyMap) : null,
    [selectedInvoice, historyMap],
  )

  useEffect(() => {
    if (!session?.user) return
    if (orderedIds.length === 0) {
      setSelectedInvoiceId(null)
      setActiveInvoiceId(null)
      return
    }

    if (selectedInvoiceId && !orderedIds.includes(selectedInvoiceId)) {
      setSelectedInvoiceId(null)
      setActiveInvoiceId(null)
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

  const updateSelection = useCallback((id: string) => {
    setSelectedInvoiceId((current) => (current === id ? current : id))
    setActiveInvoiceId(id)
    setShowInspectorReject(false)
    setInspectorRejectReason('')
    setDrawerOpen(true)
  }, [])

  const setRowElementRef = useCallback(
    (id: string, node: HTMLTableRowElement | null) => {
      rowRefs.current[id] = node
    },
    [],
  )

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
        await rejectInvoice({ data: { id: invoice.id, reason } })
      }

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

  const handleApprove = useCallback(
    async (invoice: PendingInvoice) => {
      await decide(invoice, 'approve')
    },
    [decide],
  )

  const handleReject = useCallback(
    async (invoice: PendingInvoice, reason?: string) => {
      await decide(invoice, 'reject', reason)
    },
    [decide],
  )

  const queueKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!activeInvoiceId || orderedIds.length === 0) return
      if ((event.target as HTMLElement).tagName === 'TEXTAREA') return
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'j',
          'k',
          'A',
          'a',
          'R',
          'r',
          'Enter',
        ].includes(event.key)
      ) {
        event.preventDefault()
      }

      const currentIndex = orderedIds.indexOf(activeInvoiceId)
      const moveBy =
        event.key === 'ArrowDown' || event.key === 'j'
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

      if (event.key === 'A' || event.key === 'a') {
        void handleApprove(invoice)
        return
      }

      if (event.key === 'R' || event.key === 'r') {
        void handleReject(invoice, '')
        return
      }
    },
    [
      activeInvoiceId,
      orderedIds,
      pending,
      moveFocus,
      handleApprove,
      handleReject,
      updateSelection,
    ],
  )

  return (
    <AdminLayout
      title="Review"
      pendingCount={pending.length}
      processedCount={counts.all}
    >
      <div>
        <SummaryBand
          pending={pending}
          pendingByCurrency={currencySummary}
          signalCounts={signalMap.totals}
          userCounts={entitySplit}
          hasAny={pending.length > 0}
        />

        <section className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div
            ref={queueRef}
            tabIndex={0}
            onKeyDown={queueKeyDown}
            className="scroll-area max-h-[68vh] overflow-auto focus:outline-none lg:max-h-[calc(100vh-18rem)]"
          >
            {orderedInvoices.length === 0 ? (
              <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">
                <p className="font-medium text-[var(--foreground)]">
                  No invoices waiting
                </p>
                <p className="mt-1">
                  Pending queue is empty. New submissions will land here.
                </p>
              </div>
            ) : (
              <div className="-mx-px overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead className="sticky top-0 z-10 bg-[var(--secondary)]">
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Contractor</th>
                      <th className="px-4 py-3">Entity</th>
                      <th className="px-4 py-3">Invoice date</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedInvoices.map((invoice) => {
                      const active = invoice.id === activeInvoiceId
                      const loading = rowLoading.has(invoice.id)
                      const contractor =
                        invoice.userName || getBillToName(invoice.billTo)
                      const amount = formatMoney(
                        invoice.grandTotalCents,
                        invoice.currencyCode,
                      )

                      return (
                        <tr
                          key={invoice.id}
                          role="button"
                          tabIndex={0}
                          ref={(node) => setRowElementRef(invoice.id, node)}
                          onClick={() => {
                            updateSelection(invoice.id)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              updateSelection(invoice.id)
                            }
                          }}
                          className={`cursor-pointer border-b border-[var(--border)] bg-[var(--background)] transition-colors last:border-b-0 hover:bg-[var(--surface-sunken)] focus-visible:bg-[var(--surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/15 ${
                            active ? 'bg-[var(--surface-sunken)]' : ''
                          } ${loading ? 'opacity-70' : ''}`}
                        >
                          <td className="px-4 py-3.5 text-xs tabular-nums font-medium text-[var(--foreground)]">
                            #{invoice.invoiceNumber}
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-sm text-[var(--foreground)]">
                              {contractor}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-[var(--foreground)]">
                            {invoice.entityName ?? 'Unknown'}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-[var(--foreground)]">
                            {formatDate(invoice.invoiceDate)}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-[var(--foreground)]">
                            {formatDate(invoice.createdAt)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-sm tabular-nums text-[var(--foreground)]">
                            {amount}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-[var(--muted-foreground)]">
                            {loading ? 'Updating…' : 'Pending'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <Drawer
          direction="right"
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open)
            if (!open) setActiveInvoiceId(null)
          }}
          handleOnly
          noBodyStyles
        >
          <DrawerContent className="!duration-0 !transition-none [&[data-vaul-drawer-direction=right]]:!translate-x-0">
            <DrawerHeader className="border-b border-[var(--border)]">
              <DrawerTitle className="text-sm font-medium text-[var(--foreground)]">
                {selectedInvoice
                  ? `${selectedInvoice.userName || getBillToName(selectedInvoice.billTo)} · ${selectedInvoice.invoiceNumber}`
                  : 'Invoice'}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <InspectorSummary
                invoice={selectedInvoice}
                invoiceDetail={invoiceDetail}
                prior={priorInvoice}
                loading={detailLoading}
              />
            </div>

            {selectedInvoice && (
              <div className="space-y-2 border-t border-[var(--border)] p-4">
                <Button
                  className="w-full"
                  onClick={() => {
                    void handleApprove(selectedInvoice)
                  }}
                  disabled={rowLoading.has(selectedInvoice.id)}
                >
                  {rowLoading.has(selectedInvoice.id) ? (
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
                    disabled={rowLoading.has(selectedInvoice.id)}
                  >
                    <X size={14} />
                    Reject invoice
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={inspectorRejectReason}
                      onChange={(event) =>
                        setInspectorRejectReason(event.target.value)
                      }
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
                          void handleReject(
                            selectedInvoice,
                            inspectorRejectReason,
                          )
                          setShowInspectorReject(false)
                          setInspectorRejectReason('')
                        }}
                        disabled={rowLoading.has(selectedInvoice.id)}
                      >
                        Submit reject
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedInvoice.userId && (
                    <Link
                      to="/contractors/$userId"
                      params={{ userId: selectedInvoice.userId }}
                      className="block flex-1"
                    >
                      <Button className="w-full" variant="ghost" size="sm">
                        <Clock3 size={12} />
                        View contractor
                      </Button>
                    </Link>
                  )}
                  <Link
                    to="/invoices/$id"
                    params={{ id: selectedInvoice.id }}
                    className="block flex-1"
                  >
                    <Button className="w-full" variant="ghost" size="sm">
                      <ExternalLink size={12} />
                      Open full invoice
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </AdminLayout>
  )
}
