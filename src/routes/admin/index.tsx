import { useState, useEffect, useRef } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { requireAdmin } from '@/lib/route-auth'
import {
  listPendingInvoices,
  getProcessedInvoiceCounts,
  approveInvoice,
  rejectInvoice,
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
import { Route as RootRoute } from '@/routes/__root'
import { AdminLayout } from '@/components/AdminLayout'
import { formatCurrency } from '@/components/invoice/useInvoice'
import { Check, X, ExternalLink, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/StatusBadge'
import { InvoiceQuickView } from '@/components/InvoiceQuickView'
import {
  formatInvoiceDate,
  getBillToName as getBillToNameShared,
} from '@/components/InvoiceRow'

export const Route = createFileRoute('/admin/')({
  beforeLoad: requireAdmin,
  loader: async () => {
    const pending = await listPendingInvoices()
    const counts = await getProcessedInvoiceCounts()
    return { pending, counts }
  },
  component: AdminPage,
})

type Invoice = Awaited<ReturnType<typeof listPendingInvoices>>[number]

const formatDate = formatInvoiceDate
const getBillToName = getBillToNameShared

function sumAmount(invoices: Invoice[]): string {
  if (invoices.length === 0) return '$0'
  const total = invoices.reduce((s, i) => s + i.grandTotalCents, 0)
  return formatCurrency(total / 100, invoices[0].currencyCode)
}

function getLastPaid(inv: Invoice, all: Invoice[]) {
  const paid = all
    .filter(
      (i) => i.userId === inv.userId && i.status === 'paid' && i.id !== inv.id,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  return paid.length > 0 ? paid[0] : null
}

// ─── Entity badge colors ────────────────────────────────────────

function entityBadgeClass(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, '')
  if (key.includes('sv'))
    return 'rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300'
  if (key.includes('lp'))
    return 'rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  return 'rounded bg-[var(--muted)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]'
}

// ─── Pending Invoice Row ─────────────────────────────────────────

function PendingRow({
  inv,
  allInvoices,
  isSelected,
  showCheckbox,
  onToggleSelect,
  onAction,
  onOpenDetail,
}: {
  inv: Invoice
  allInvoices: Invoice[]
  isSelected: boolean
  showCheckbox: boolean
  onToggleSelect: () => void
  onAction: () => void
  onOpenDetail: () => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showApproved, setShowApproved] = useState(false)
  const approvedTimer = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    return () => {
      if (approvedTimer.current) clearTimeout(approvedTimer.current)
    }
  }, [])

  const amount = formatCurrency(inv.grandTotalCents / 100, inv.currencyCode)
  const lastPaid = getLastPaid(inv, allInvoices)
  const matchesLast =
    lastPaid && lastPaid.grandTotalCents === inv.grandTotalCents

  async function handleApprove(e: React.MouseEvent) {
    e.stopPropagation()
    setLoading('approve')
    try {
      await approveInvoice({ data: { id: inv.id } })
      setLoading(null)
      setShowApproved(true)
      approvedTimer.current = setTimeout(() => {
        setShowApproved(false)
        onAction()
      }, 600)
    } catch {
      setLoading(null)
    }
  }

  if (showApproved) {
    return (
      <div className="flex items-center gap-2.5 py-3.5 text-sm text-emerald-600 dark:text-emerald-400">
        <Check size={15} strokeWidth={2.5} />
        <span className="font-medium">Approved</span>
        <span className="text-emerald-600/60 dark:text-emerald-400/60">
          #{inv.invoiceNumber}
        </span>
      </div>
    )
  }

  return (
    <div
      onClick={onOpenDetail}
      className="flex cursor-pointer items-center gap-3 py-3.5 transition-colors hover:bg-[var(--accent)]/50"
    >
      {/* Checkbox — fixed-width column for alignment */}
      {showCheckbox && (
        <div className="flex w-5 shrink-0 justify-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect()}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Identity: name, invoice #, entity, date, tax */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {inv.userName || getBillToName(inv.billTo)}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            #{inv.invoiceNumber}
          </span>
          {inv.entityName && (
            <span className={entityBadgeClass(inv.entityName)}>
              {inv.entityName}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <span>{getBillToName(inv.billTo)}</span>
          <span className="opacity-30">&middot;</span>
          <span>{formatDate(inv.invoiceDate)}</span>
          {inv.totalTaxCents > 0 && (
            <>
              <span className="opacity-30">&middot;</span>
              <span>
                {inv.taxPercent
                  ? `${inv.taxPercent}% tax`
                  : `+${formatCurrency(inv.totalTaxCents / 100, inv.currencyCode)} tax`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Amount + comparison signal — fixed min-width for column alignment */}
      <div className="min-w-[7rem] shrink-0 text-right">
        <div className="text-sm font-medium tabular-nums text-[var(--foreground)]">
          {amount}
        </div>
        {matchesLast ? (
          <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            Matches last
          </div>
        ) : lastPaid ? (
          <div className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            Last{' '}
            {formatCurrency(
              lastPaid.grandTotalCents / 100,
              lastPaid.currencyCode,
            )}
          </div>
        ) : (
          <div className="mt-0.5 text-xs italic text-[var(--muted-foreground)]">
            First invoice
          </div>
        )}
      </div>

      {/* Approve — visually separated from the clickable row content */}
      <div className="shrink-0 border-l border-[var(--border)] pl-3">
        <button
          onClick={handleApprove}
          disabled={loading !== null}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 dark:hover:border-emerald-800 dark:hover:bg-emerald-950 dark:hover:text-emerald-400"
        >
          {loading === 'approve' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            'Approve'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Pending Section ─────────────────────────────────────────────

function PendingSection({
  invoices,
  allInvoices,
  onAction,
  onOpenDetail,
}: {
  invoices: Invoice[]
  allInvoices: Invoice[]
  onAction: () => void
  onOpenDetail: (inv: Invoice) => void
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)

  const showBatchControls = invoices.length > 1
  const allSelected =
    selectedIds.size === invoices.length && invoices.length > 0
  const someSelected = selectedIds.size > 0 && !allSelected

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(invoices.map((i) => i.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleBatchApprove() {
    setBatchLoading(true)
    try {
      for (const id of selectedIds) {
        await approveInvoice({ data: { id } })
      }
      setSelectedIds(new Set())
      onAction()
    } finally {
      setBatchLoading(false)
    }
  }

  const pendingTotal = invoices.reduce((s, i) => s + i.grandTotalCents, 0)

  return (
    <section className="mb-6">
      {/* Section header — "All" checkbox aligned with row checkboxes */}
      <div className="mb-3 flex items-center gap-3">
        {showBatchControls && (
          <div className="flex w-5 shrink-0 justify-center">
            <Checkbox
              checked={
                allSelected ? true : someSelected ? 'indeterminate' : false
              }
              onCheckedChange={toggleSelectAll}
            />
          </div>
        )}
        <div className="flex flex-1 items-baseline justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Pending ({invoices.length})
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
              {sumAmount(invoices)}
            </span>
            <div
              className={`transition-all duration-150 ${selectedIds.size > 0 ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <Button
                size="xs"
                onClick={() => void handleBatchApprove()}
                disabled={batchLoading}
              >
                {batchLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
                {batchLoading ? 'Approving...' : `Approve ${selectedIds.size}`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice list — bottom border to ground the content */}
      <div className="divide-y divide-[var(--border)] border-b border-[var(--border)]">
        {invoices.map((inv) => (
          <PendingRow
            key={inv.id}
            inv={inv}
            allInvoices={allInvoices}
            isSelected={selectedIds.has(inv.id)}
            showCheckbox={showBatchControls}
            onToggleSelect={() => toggleSelect(inv.id)}
            onAction={onAction}
            onOpenDetail={() => onOpenDetail(inv)}
          />
        ))}
      </div>
    </section>
  )
}

// ─── Zero State ──────────────────────────────────────────────────

function AllCaughtUp({ counts }: { counts: Record<string, number> }) {
  const total = counts.all ?? 0
  const paid = counts.paid ?? 0

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center bg-emerald-50 dark:bg-emerald-950">
        <svg
          className="h-7 w-7 text-emerald-600 dark:text-emerald-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M5 13l4 4L19 7"
            className="animate-[draw-check_0.5s_ease-out_0.2s_both]"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 24,
            }}
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-[var(--foreground)]">
        All caught up
      </h3>
      <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
        No invoices waiting for review
      </p>
      {total > 0 && (
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          You've processed{' '}
          <span className="font-medium text-[var(--foreground)]">{total}</span>{' '}
          invoice{total !== 1 ? 's' : ''}
          {paid > 0 && (
            <>
              .{' '}
              <span className="font-medium text-[var(--foreground)]">
                {paid}
              </span>{' '}
              paid so far.
            </>
          )}
        </p>
      )}
    </div>
  )
}

// ─── Review / Reject Dialog ──────────────────────────────────────

function ReviewDialog({
  inv,
  open,
  onOpenChange,
  allInvoices,
  onAction,
}: {
  inv: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  allInvoices: Invoice[]
  onAction: () => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  if (!inv) return null

  const amount = formatCurrency(inv.grandTotalCents / 100, inv.currencyCode)
  const isPending = inv.status === 'submitted'
  const isRejected = inv.status === 'rejected'

  const lastPaid = getLastPaid(inv, allInvoices)

  async function handleApprove() {
    setLoading('approve')
    try {
      await approveInvoice({ data: { id: inv!.id } })
      onOpenChange(false)
      onAction()
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    setLoading('reject')
    try {
      await rejectInvoice({
        data: { id: inv!.id, reason: rejectReason.trim() || undefined },
      })
      onOpenChange(false)
      onAction()
    } finally {
      setLoading(null)
      setShowRejectForm(false)
      setRejectReason('')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setShowRejectForm(false)
          setRejectReason('')
        }
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            #{inv.invoiceNumber}
            {!isPending && <StatusBadge status={inv.status} />}
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
          date={formatDate(inv.invoiceDate)}
          fromEntity={inv.companyDetails.split(/\\n|\n/)[0]}
          toEntity={getBillToName(inv.billTo)}
          amountExtra={
            <div className="mt-1 flex items-baseline justify-between text-xs text-[var(--muted-foreground)]">
              <div>
                {lastPaid && (
                  <>
                    Last paid{' '}
                    <span className="font-medium text-[var(--foreground)]">
                      {formatCurrency(
                        lastPaid.grandTotalCents / 100,
                        lastPaid.currencyCode,
                      )}
                    </span>{' '}
                    on {formatDate(lastPaid.createdAt)}
                  </>
                )}
              </div>
              {inv.totalTaxCents > 0 && (
                <div>
                  incl.{' '}
                  {formatCurrency(inv.totalTaxCents / 100, inv.currencyCode)}{' '}
                  tax
                  {inv.taxPercent ? ` (${inv.taxPercent}%)` : ''}
                </div>
              )}
            </div>
          }
        />

        {/* Rejection reason (for already-rejected invoices) */}
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

        {/* Actions for pending invoices */}
        {isPending && !showRejectForm && (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => void handleApprove()}
              disabled={loading !== null}
            >
              {loading === 'approve' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              {loading === 'approve' ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRejectForm(true)}
              disabled={loading !== null}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
            >
              Reject
            </Button>
            <Link to="/invoices/$id" params={{ id: inv.id }}>
              <Button
                variant="ghost"
                size="icon"
                className="text-[var(--muted-foreground)]"
              >
                <ExternalLink size={14} />
              </Button>
            </Link>
          </div>
        )}

        {/* Reject form */}
        {isPending && showRejectForm && (
          <div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason (optional)"
              rows={2}
              autoFocus
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectReason('')
                }}
                disabled={loading !== null}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                onClick={() => void handleReject()}
                disabled={loading !== null}
              >
                {loading === 'reject' ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        )}

        {/* View link for non-pending */}
        {!isPending && (
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
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Admin Page ──────────────────────────────────────────────────

function AdminPage() {
  const { session } = RootRoute.useRouteContext()
  const { pending, counts } = Route.useLoaderData()
  const router = useRouter()
  const [selected, setSelected] = useState<Invoice | null>(null)

  if (!session?.user) return null

  const hasProcessed = counts.all > 0
  const hasAnything = pending.length > 0 || hasProcessed

  return (
    <AdminLayout
      title="Review"
      pendingCount={pending.length}
      processedCount={counts.all}
    >
        {pending.length > 0 ? (
          <PendingSection
            invoices={pending}
            allInvoices={pending}
            onAction={() => void router.invalidate()}
            onOpenDetail={setSelected}
          />
        ) : hasProcessed ? (
          <AllCaughtUp counts={counts} />
        ) : null}

        {!hasAnything && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              No invoices to review
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Invoices will appear here once users submit them
            </p>
          </div>
        )}
      <ReviewDialog
        inv={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        allInvoices={pending}
        onAction={() => void router.invalidate()}
      />
    </AdminLayout>
  )
}
