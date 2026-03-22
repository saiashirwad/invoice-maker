import { useState, useRef, useEffect, useCallback } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  Send,
  Check,
  X,
  Banknote,
  FilePlus2,
  AlertCircle,
  Plus,
  Minus,
  Pencil,
} from 'lucide-react'
import { requireAuth } from '@/lib/route-auth'
import {
  getInvoice,
  submitInvoice,
  approveInvoice,
  rejectInvoice,
  markPaid,
} from '@/lib/invoice-fns'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import InvoicePreview from '@/components/invoice/InvoicePreview'
import type { InvoiceData } from '@/components/invoice/useInvoice'
import { formatCurrency } from '@/components/invoice/useInvoice'
import { fromCents } from '@/forms/schemas/invoice'
import { Route as RootRoute } from '@/routes/__root'

export const Route = createFileRoute('/invoices/$id')({
  beforeLoad: requireAuth,
  loader: async ({ params }) => {
    const invoice = await getInvoice({ data: { id: params.id } })
    return { invoice }
  },
  component: InvoiceDetailPage,
})

const actionLabels: Record<string, string> = {
  created: 'Created',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Marked paid',
}

function formatTimelineDate(timestamp: Date): string {
  const d = typeof timestamp === 'number' ? new Date(timestamp) : timestamp
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function InvoiceDetailPage() {
  const { invoice } = Route.useLoaderData()
  const { session } = RootRoute.useRouteContext()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const userRole = (session?.user as { role?: string } | undefined)?.role
  const userId = session?.user?.id
  const isOwner = invoice.userId === userId
  const isAdmin = userRole === 'admin'
  const isAccountant = userRole === 'accountant'

  const canSubmit = isOwner && invoice.status === 'draft'
  const canApprove = isAdmin && invoice.status === 'submitted'
  const canMarkPaid = isAccountant && invoice.status === 'approved'
  const hasActions = canSubmit || canApprove || canMarkPaid

  async function handleAction(
    action: 'submit' | 'approve' | 'reject' | 'markPaid',
  ) {
    setLoading(action)
    try {
      if (action === 'submit') {
        await submitInvoice({ data: { id: invoice.id } })
      } else if (action === 'approve') {
        await approveInvoice({ data: { id: invoice.id } })
      } else if (action === 'reject') {
        await rejectInvoice({
          data: { id: invoice.id, reason: rejectReason.trim() || undefined },
        })
      } else {
        await markPaid({ data: { id: invoice.id } })
      }
      setShowRejectForm(false)
      setRejectReason('')
      await router.invalidate()
    } finally {
      setLoading(null)
    }
  }

  // Convert DB invoice to InvoiceData shape for preview
  const previewData: InvoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    logo: null,
    companyDetails: invoice.companyDetails,
    senderTaxId: invoice.senderTaxId ?? '',
    billTo: invoice.billTo,
    clientTaxId: invoice.clientTaxId ?? '',
    currency: invoice.currencyCode,
    invoiceDate: invoice.invoiceDate
      ? new Date(invoice.invoiceDate).toISOString().split('T')[0]
      : '',
    serviceDate: invoice.serviceDate
      ? new Date(invoice.serviceDate).toISOString().split('T')[0]
      : '',
    dueDate: invoice.dueDate
      ? new Date(invoice.dueDate).toISOString().split('T')[0]
      : '',
    items: invoice.lineItems.map((li) => ({
      id: li.id,
      description: li.description,
      unitCost: fromCents(li.unitCostCents),
      quantity: String(li.quantity),
    })),
    notes: invoice.notes ?? '',
    bankDetails: invoice.bankDetails ?? '',
    taxPercent: invoice.taxPercent != null ? String(invoice.taxPercent) : '',
  }

  const subtotal = invoice.subtotalCents / 100
  const taxAmount = invoice.totalTaxCents / 100
  const total = invoice.grandTotalCents / 100

  const getItemAmount = (item: InvoiceData['items'][0]) => {
    const cost = parseFloat(item.unitCost) || 0
    const qty = parseFloat(item.quantity) || 0
    return cost * qty
  }

  const timeline = invoice.timeline ?? []
  const isRejected = invoice.status === 'rejected'

  // Zoom / fit-to-width for preview
  const PREVIEW_BASE_WIDTH = 640
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [zoomOffset, setZoomOffset] = useState(0)
  const [fitScale, setFitScale] = useState(1)
  const [previewHeight, setPreviewHeight] = useState(0)

  const measure = useCallback(() => {
    if (!containerRef.current) return
    const style = getComputedStyle(containerRef.current)
    const innerWidth =
      containerRef.current.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight)
    setFitScale(innerWidth / PREVIEW_BASE_WIDTH)
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  useEffect(() => {
    if (!previewRef.current) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPreviewHeight(entry.contentRect.height)
      }
    })
    ro.observe(previewRef.current)
    return () => ro.disconnect()
  }, [])

  const scale = fitScale + zoomOffset * 0.1

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)] print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
              #{invoice.invoiceNumber}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="flex items-center gap-2">
            {canSubmit && (
              <>
                <Button size="sm" variant="outline" asChild>
                  <Link
                    to="/invoices/new"
                    search={{ edit: invoice.id }}
                  >
                    <Pencil size={14} className="mr-1.5" />
                    Edit
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleAction('submit')}
                  disabled={loading !== null}
                >
                  <Send size={14} className="mr-1.5" />
                  {loading === 'submit' ? 'Submitting...' : 'Submit for Review'}
                </Button>
              </>
            )}
            {canApprove && !showRejectForm && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRejectForm(true)}
                  disabled={loading !== null}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <X size={14} className="mr-1.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleAction('approve')}
                  disabled={loading !== null}
                >
                  <Check size={14} className="mr-1.5" />
                  {loading === 'approve' ? 'Approving...' : 'Approve'}
                </Button>
              </>
            )}
            {canMarkPaid && (
              <Button
                size="sm"
                onClick={() => void handleAction('markPaid')}
                disabled={loading !== null}
              >
                <Banknote size={14} className="mr-1.5" />
                {loading === 'markPaid' ? 'Processing...' : 'Mark Paid'}
              </Button>
            )}
            {isRejected && isOwner && (
              <Button size="sm" variant="outline" asChild>
                <Link to="/invoices/new">
                  <FilePlus2 size={14} />
                  Create Revised Invoice
                </Link>
              </Button>
            )}
            {hasActions && (
              <span className="ml-1 text-xs font-semibold tabular-nums text-[var(--foreground)]">
                {formatCurrency(total, invoice.currencyCode)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Reject confirmation bar */}
      {showRejectForm && (
        <div className="border-b border-[var(--border)] bg-[var(--background)] print:hidden">
          <div className="mx-auto flex max-w-5xl items-start gap-3 px-5 py-3 sm:px-8">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={2}
              autoFocus
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <div className="flex shrink-0 gap-2">
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
                size="sm"
                variant="destructive"
                onClick={() => void handleAction('reject')}
                disabled={loading !== null}
              >
                {loading === 'reject' ? 'Rejecting...' : 'Reject Invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status context bar */}
      {timeline.length > 0 && (
        <div
          className={`border-b print:hidden ${
            isRejected
              ? 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30'
              : 'border-[var(--border)] bg-[var(--background)]'
          }`}
        >
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            {/* Timeline as inline text */}
            <div className="flex flex-wrap items-center gap-x-1 py-2.5 text-xs text-[var(--muted-foreground)]">
              {timeline.map((entry, i) => {
                const showActor = isAdmin || isAccountant
                return (
                  <span key={i} className="inline-flex items-center gap-1">
                    {i > 0 && <span className="mx-0.5">&rarr;</span>}
                    <span
                      className={`font-medium ${
                        i === timeline.length - 1
                          ? isRejected
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-[var(--foreground)]'
                          : 'text-[var(--foreground)]'
                      }`}
                    >
                      {actionLabels[entry.action] ?? entry.action}
                    </span>
                    <span>
                      {showActor && <>by {entry.actorName} </>}
                      on {formatTimelineDate(entry.createdAt)}
                    </span>
                  </span>
                )
              })}
            </div>

            {/* Rejection reason */}
            {isRejected && invoice.rejectionReason && (
              <div className="flex items-start gap-2 border-t border-red-200 py-2.5 dark:border-red-800">
                <AlertCircle
                  size={14}
                  className="mt-0.5 shrink-0 text-red-500"
                />
                <p className="text-sm text-red-800 dark:text-red-300">
                  {invoice.rejectionReason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="relative min-h-[50vh] bg-[var(--muted)] print:bg-white print:p-0">
        {/* Zoom controls — sticky to top-right of canvas */}
        <div className="sticky top-14 z-10 flex justify-end print:hidden">
          <div className="mr-4 mt-4 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-0.5 shadow-sm">
            <button
              onClick={() => setZoomOffset((z) => z - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--foreground)]/60 transition hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              aria-label="Zoom out"
            >
              <Minus size={14} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setZoomOffset(0)}
              className="px-1.5 text-[11px] font-semibold tabular-nums text-[var(--foreground)]/60 transition hover:text-[var(--foreground)]"
              aria-label="Reset zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={() => setZoomOffset((z) => z + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--foreground)]/60 transition hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              aria-label="Zoom in"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div ref={containerRef} className="mx-auto max-w-5xl px-5 sm:px-8">
          <div
            className="py-5 sm:py-8 print:py-0"
            style={{
              height: previewHeight ? previewHeight * scale + 40 : undefined,
            }}
          >
            <div
              className="mx-auto"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                width: PREVIEW_BASE_WIDTH,
              }}
            >
              <div ref={previewRef}>
                <InvoicePreview
                  data={previewData}
                  calculations={{ subtotal, taxAmount, total }}
                  getItemAmount={getItemAmount}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
