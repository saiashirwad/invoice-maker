import { useState } from 'react'
import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { UserMenu } from '@/components/UserMenu'
import { requireUser } from '@/lib/route-auth'
import { listInvoices } from '@/lib/invoice-fns'
import { Button } from '@/components/ui/button'
import { Route as RootRoute } from '@/routes/__root'
import { formatCurrency } from '@/components/invoice/useInvoice'
import { SectionHeader } from '@/components/SectionHeader'
import {
  InvoiceRow,
  invoiceRowClass,
  getBillToName,
} from '@/components/InvoiceRow'
import { Plus, ChevronRight, ChevronDown, Copy } from 'lucide-react'

export const Route = createFileRoute('/user')({
  beforeLoad: requireUser,
  loader: async () => {
    const invoices = await listInvoices()
    return { invoices }
  },
  component: UserPage,
})

function UserPage() {
  const { session } = RootRoute.useRouteContext()
  const { invoices } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()

  if (!session?.user) return null

  const primaryCurrency = invoices[0]?.currencyCode ?? 'USD'
  const outstandingCents = invoices
    .filter((inv) => inv.status === 'submitted' || inv.status === 'approved')
    .reduce((sum, inv) => sum + inv.grandTotalCents, 0)
  const paidCents = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.grandTotalCents, 0)

  // Group by status
  const needsAction = invoices.filter(
    (inv) => inv.status === 'draft' || inv.status === 'rejected',
  )
  const inProgress = invoices.filter(
    (inv) => inv.status === 'submitted' || inv.status === 'approved',
  )
  const completed = invoices.filter((inv) => inv.status === 'paid')
  const [completedExpanded, setCompletedExpanded] = useState(true)

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:px-8">
          <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
            Invoices
          </h1>
          <div className="flex items-center gap-3">
            {invoices.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void navigate({
                    to: '/invoices/new',
                    search: { duplicate: invoices[0].id },
                  })
                }
              >
                <Copy size={14} className="mr-1.5" />
                Duplicate Last
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void navigate({ to: '/invoices/new' })}
            >
              <Plus size={15} className="mr-1.5" />
              New Invoice
            </Button>
            <UserMenu name={session.user.name} email={session.user.email} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              No invoices yet
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Create your first invoice to get started
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void navigate({ to: '/invoices/new' })}
            >
              <Plus size={15} className="mr-1.5" />
              New Invoice
            </Button>
          </div>
        ) : (
          <>
            {(outstandingCents > 0 || paidCents > 0) && (
              <div className="mb-6 space-y-3">
                {/* Hero card — Paid total */}
                {paidCents > 0 && (
                  <div className="bg-[#1c1917] px-5 py-4 dark:bg-[#064e3b]">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                      Paid
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums text-white">
                      {formatCurrency(paidCents / 100, primaryCurrency)}
                    </div>
                    <div className="mt-0.5 text-xs text-white/50">
                      {completed.length} invoice
                      {completed.length !== 1 ? 's' : ''}
                    </div>
                    {/* Progress bar: paid vs total */}
                    {outstandingCents > 0 && (
                      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-emerald-400 transition-all"
                          style={{
                            width: `${Math.round((paidCents / (paidCents + outstandingCents)) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {/* Secondary card — Outstanding */}
                {outstandingCents > 0 && (
                  <div className="border-l-2 border-l-amber-500 bg-[var(--muted)] px-4 py-3">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Outstanding
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]">
                      {formatCurrency(outstandingCents / 100, primaryCurrency)}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {inProgress.length} invoice
                      {inProgress.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            )}

            {needsAction.length > 0 && (
              <section className="mb-8">
                <SectionHeader
                  label="Needs Action"
                  count={needsAction.length}
                />
                <div className="divide-y divide-[var(--border)]">
                  {needsAction.map((inv) => (
                    <Link
                      key={inv.id}
                      to="/invoices/$id"
                      params={{ id: inv.id }}
                      className={`${invoiceRowClass} ${inv.status === 'rejected' ? 'border-l-red-500 dark:border-l-red-400' : 'border-l-blue-500 dark:border-l-blue-400'}`}
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
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {inProgress.length > 0 && (
              <section className="mb-8">
                <SectionHeader label="In Progress" count={inProgress.length} />
                <div className="divide-y divide-[var(--border)]">
                  {inProgress.map((inv) => (
                    <Link
                      key={inv.id}
                      to="/invoices/$id"
                      params={{ id: inv.id }}
                      className={`${invoiceRowClass} ${inv.status === 'approved' ? 'border-l-emerald-500 dark:border-l-emerald-400' : 'border-l-blue-500 dark:border-l-blue-400'}`}
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
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <button
                  onClick={() => setCompletedExpanded((v) => !v)}
                  className="mb-3 flex w-full items-center justify-between text-left"
                >
                  <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Completed ({completed.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    {!completedExpanded && (
                      <span className="text-xs tabular-nums text-[var(--muted-foreground)]">
                        {formatCurrency(paidCents / 100, primaryCurrency)}
                      </span>
                    )}
                    {completedExpanded ? (
                      <ChevronDown
                        size={14}
                        className="text-[var(--muted-foreground)]"
                      />
                    ) : (
                      <ChevronRight
                        size={14}
                        className="text-[var(--muted-foreground)]"
                      />
                    )}
                  </div>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    completedExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="divide-y divide-[var(--border)]">
                      {completed.map((inv) => (
                        <Link
                          key={inv.id}
                          to="/invoices/$id"
                          params={{ id: inv.id }}
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
                          />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
