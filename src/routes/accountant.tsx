import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { UserMenu } from '@/components/UserMenu'
import { requireAccountant } from '@/lib/route-auth'
import { listAccountantInvoices, markPaid } from '@/lib/invoice-fns'
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
import { formatCurrency } from '@/components/invoice/useInvoice'
import { StatusBadge } from '@/components/StatusBadge'
import {
  InvoiceRow,
  invoiceRowClass,
  getBillToName,
  formatInvoiceDate,
} from '@/components/InvoiceRow'
import { InvoiceQuickView } from '@/components/InvoiceQuickView'
import { Banknote, ExternalLink, Copy, Check } from 'lucide-react'

export const Route = createFileRoute('/accountant')({
  beforeLoad: requireAccountant,
  loader: async () => {
    const invoices = await listAccountantInvoices()
    return { invoices }
  },
  component: AccountantPage,
})

type Invoice = Awaited<ReturnType<typeof listAccountantInvoices>>[number]

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title={label ? `Copy ${label}` : 'Copy'}
      className="inline-flex shrink-0 items-center gap-1 rounded-md p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

function PaymentDialog({
  inv,
  open,
  onOpenChange,
  onPaid,
}: {
  inv: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaid: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')

  if (!inv) return null

  const amount = formatCurrency(inv.grandTotalCents / 100, inv.currencyCode)
  const isPaid = inv.status === 'paid'

  async function handleMarkPaid() {
    if (!inv) return
    setLoading(true)
    try {
      await markPaid({
        data: {
          id: inv.id,
          paymentMethod: paymentMethod.trim() || undefined,
          paymentReference: paymentReference.trim() || undefined,
        },
      })
      setPaymentMethod('')
      setPaymentReference('')
      onPaid()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            #{inv.invoiceNumber}
            <StatusBadge status={inv.status} />
          </DialogTitle>
          <DialogDescription>
            {getBillToName(inv.billTo)}
            {inv.userName && (
              <>
                {' '}
                &middot; by{' '}
                <Link
                  to="/contractors/$userId"
                  params={{ userId: inv.userId }}
                  className="underline decoration-[var(--muted-foreground)]/40 underline-offset-2 hover:text-[var(--foreground)] hover:decoration-[var(--foreground)]/60"
                >
                  {inv.userName}
                </Link>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <InvoiceQuickView
          amount={amount}
          date={
            isPaid && inv.paymentDate
              ? formatInvoiceDate(inv.paymentDate)
              : formatInvoiceDate(inv.invoiceDate)
          }
          toEntity={inv.billTo.replace(/\\n/g, '\n')}
          toEntityPreformatted
          amountExtra={
            <div className="mt-1 flex justify-end">
              <CopyButton value={amount} label="amount" />
            </div>
          }
        >
          <div className="flex justify-end -mt-2">
            <CopyButton
              value={inv.billTo.replace(/\\n/g, '\n')}
              label="address"
            />
          </div>

          {inv.bankDetails && (
            <>
              <hr className="border-[var(--border)]" />
              <div className="text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Bank Details
                  </div>
                  <CopyButton
                    value={inv.bankDetails.replace(/\\n/g, '\n')}
                    label="bank details"
                  />
                </div>
                <div className="mt-1 whitespace-pre-line font-mono text-xs leading-relaxed text-[var(--foreground)]">
                  {inv.bankDetails.replace(/\\n/g, '\n')}
                </div>
              </div>
            </>
          )}
        </InvoiceQuickView>

        {!isPaid ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                  Payment Method
                </label>
                <input
                  type="text"
                  className="focus-emerald h-9 w-full border-b border-[var(--border)]/75 bg-transparent px-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-foreground)]/50 hover:border-[var(--border)]"
                  placeholder="e.g. Bank transfer"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                  Reference
                </label>
                <input
                  type="text"
                  className="focus-emerald h-9 w-full border-b border-[var(--border)]/75 bg-transparent px-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-foreground)]/50 hover:border-[var(--border)]"
                  placeholder="e.g. TXN-12345"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => void handleMarkPaid()}
                disabled={loading}
              >
                <Banknote size={14} />
                {loading ? 'Processing...' : 'Mark Paid'}
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
          </div>
        ) : (
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

function getMonthKey(timestamp: number | Date | null): string {
  if (!timestamp) return ''
  const d = typeof timestamp === 'number' ? new Date(timestamp) : timestamp
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
}

function formatMonthLabel(timestamp: number | Date | null): string {
  if (!timestamp) return ''
  const d = typeof timestamp === 'number' ? new Date(timestamp) : timestamp
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function AccountantPage() {
  const { session } = RootRoute.useRouteContext()
  const { invoices } = Route.useLoaderData()
  const router = useRouter()
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [tab, setTab] = useState<'awaiting' | 'paid'>('awaiting')

  if (!session?.user) return null

  const approved = invoices.filter((inv) => inv.status === 'approved')
  const paid = invoices.filter((inv) => inv.status === 'paid')

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:px-8">
          <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
            Payments
          </h1>
          <UserMenu name={session.user.name} email={session.user.email} />
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto flex max-w-5xl px-5 sm:px-8">
          <button
            onClick={() => setTab('awaiting')}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === 'awaiting'
                ? 'border-[var(--emerald)] text-[var(--foreground)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Awaiting Payment
            <span className="min-w-[1.25rem] rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-center text-[10px] tabular-nums text-[var(--muted-foreground)]">
              {approved.length}
            </span>
          </button>
          <button
            onClick={() => setTab('paid')}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === 'paid'
                ? 'border-[var(--emerald)] text-[var(--foreground)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Paid
            <span className="min-w-[1.25rem] rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-center text-[10px] tabular-nums text-[var(--muted-foreground)]">
              {paid.length}
            </span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        {tab === 'awaiting' && (
          <>
            {approved.length > 0 ? (
              <section>
                {/* Sticky summary */}
                <div className="sticky top-[6.75rem] z-10 -mx-5 mb-4 border-b border-[var(--border)] bg-[var(--background)]/95 px-5 py-2.5 text-xs font-medium text-[var(--muted-foreground)] backdrop-blur sm:-mx-8 sm:px-8">
                  {approved.length} invoice{approved.length !== 1 ? 's' : ''}{' '}
                  awaiting payment
                  {' \u00b7 '}
                  <span className="tabular-nums text-[var(--foreground)]">
                    {formatCurrency(
                      approved.reduce((s, i) => s + i.grandTotalCents, 0) / 100,
                      approved[0]?.currencyCode ?? 'USD',
                    )}
                  </span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {approved.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => setSelected(inv)}
                      className={invoiceRowClass}
                    >
                      <InvoiceRow
                        invoiceNumber={inv.invoiceNumber}
                        status={inv.status}
                        date={inv.invoiceDate}
                        entityName={getBillToName(inv.billTo)}
                        amount={formatCurrency(
                          inv.grandTotalCents / 100,
                          inv.currencyCode,
                        )}
                        subtitle={
                          inv.userName && (
                            <Link
                              to="/contractors/$userId"
                              params={{ userId: inv.userId }}
                              onClick={(e) => e.stopPropagation()}
                              className="underline decoration-[var(--muted-foreground)]/40 underline-offset-2 hover:text-[var(--foreground)] hover:decoration-[var(--foreground)]/60"
                            >
                              by {inv.userName}
                            </Link>
                          )
                        }
                      />
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  No invoices awaiting payment
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Approved invoices will appear here
                </p>
              </div>
            )}
          </>
        )}

        {tab === 'paid' && (
          <>
            {paid.length > 0 ? (
              <section>
                <div>
                  {paid.map((inv, i) => {
                    const prevMonth =
                      i > 0 ? getMonthKey(paid[i - 1].invoiceDate) : null
                    const curMonth = getMonthKey(inv.invoiceDate)
                    const showHeader = curMonth !== prevMonth

                    return (
                      <div key={inv.id}>
                        {showHeader && (
                          <div
                            className={`${i > 0 ? 'mt-6 border-t border-[var(--border)] pt-5' : ''} mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]`}
                          >
                            {formatMonthLabel(inv.invoiceDate)}
                          </div>
                        )}
                        <div className="border-b border-[var(--border)] last:border-b-0">
                          <button
                            onClick={() => setSelected(inv)}
                            className={invoiceRowClass}
                          >
                            <InvoiceRow
                              invoiceNumber={inv.invoiceNumber}
                              status={inv.status}
                              date={inv.invoiceDate}
                              entityName={getBillToName(inv.billTo)}
                              amount={formatCurrency(
                                inv.grandTotalCents / 100,
                                inv.currencyCode,
                              )}
                              subtitle={
                                inv.userName && (
                                  <Link
                                    to="/contractors/$userId"
                                    params={{ userId: inv.userId }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="underline decoration-[var(--muted-foreground)]/40 underline-offset-2 hover:text-[var(--foreground)] hover:decoration-[var(--foreground)]/60"
                                  >
                                    by {inv.userName}
                                  </Link>
                                )
                              }
                            />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  No paid invoices yet
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <PaymentDialog
        inv={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        onPaid={() => {
          setSelected(null)
          void router.invalidate()
        }}
      />
    </div>
  )
}
