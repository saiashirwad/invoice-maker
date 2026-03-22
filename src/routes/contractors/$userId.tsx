import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { requireAdminOrAccountant } from '@/lib/route-auth'
import { getContractorProfile } from '@/lib/invoice-fns'
import { formatCurrency } from '@/components/invoice/useInvoice'
import { Route as RootRoute } from '@/routes/__root'
import { SectionHeader } from '@/components/SectionHeader'
import { AdminLayout } from '@/components/AdminLayout'
import {
  InvoiceRow,
  invoiceRowClass,
  getBillToName,
} from '@/components/InvoiceRow'

export const Route = createFileRoute('/contractors/$userId')({
  beforeLoad: requireAdminOrAccountant,
  loader: async ({ params }) => {
    const data = await getContractorProfile({
      data: { userId: params.userId },
    })
    return data
  },
  component: ContractorProfilePage,
})

type ProfileData = Awaited<ReturnType<typeof getContractorProfile>>
type Invoice = ProfileData['invoices'][number]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function computeKpis(invoices: Invoice[], role: string | undefined) {
  const byCurrency = new Map<
    string,
    { total: number; paid: number; outstanding: number; tax: number }
  >()

  let totalCount = 0
  let paidCount = 0
  let submittedCount = 0
  let approvedCount = 0
  let rejectedCount = 0

  for (const inv of invoices) {
    totalCount++
    if (inv.status === 'paid') paidCount++
    if (inv.status === 'submitted') submittedCount++
    if (inv.status === 'approved') approvedCount++
    if (inv.status === 'rejected') rejectedCount++

    const cur = inv.currencyCode
    const existing = byCurrency.get(cur) ?? {
      total: 0,
      paid: 0,
      outstanding: 0,
      tax: 0,
    }

    existing.total += inv.grandTotalCents
    existing.tax += inv.totalTaxCents
    if (inv.status === 'paid') existing.paid += inv.grandTotalCents
    if (inv.status === 'approved') existing.outstanding += inv.grandTotalCents
    byCurrency.set(cur, existing)
  }

  let primaryCurrency = 'USD'
  let maxCount = 0
  const currencyCounts = new Map<string, number>()
  for (const inv of invoices) {
    const c = currencyCounts.get(inv.currencyCode) ?? 0
    currencyCounts.set(inv.currencyCode, c + 1)
    if (c + 1 > maxCount) {
      maxCount = c + 1
      primaryCurrency = inv.currencyCode
    }
  }

  const primary = byCurrency.get(primaryCurrency) ?? {
    total: 0,
    paid: 0,
    outstanding: 0,
    tax: 0,
  }

  return {
    totalInvoiced: formatCurrency(primary.total / 100, primaryCurrency),
    totalPaid: formatCurrency(primary.paid / 100, primaryCurrency),
    outstanding: formatCurrency(primary.outstanding / 100, primaryCurrency),
    totalTax: formatCurrency(primary.tax / 100, primaryCurrency),
    totalCount,
    paidCount,
    submittedCount,
    approvedCount,
    rejectedCount,
    primaryCurrency,
    isAdmin: role === 'admin',
  }
}

function ContractorProfilePage() {
  const { contractor, invoices } = Route.useLoaderData()
  const { session } = RootRoute.useRouteContext()
  const userRole = (session?.user as { role?: string } | undefined)?.role
  const kpis = computeKpis(invoices, userRole)
  const isAdmin = userRole === 'admin'
  const [historyExpanded, setHistoryExpanded] = useState(false)

  const pending = invoices.filter(
    (inv) => inv.status === 'submitted' || inv.status === 'approved',
  )
  const completed = invoices.filter(
    (inv) => inv.status === 'paid' || inv.status === 'rejected',
  )

  const content = (
    <div className={isAdmin ? '' : 'min-h-screen bg-[var(--background)]'}>
      <div className={isAdmin ? '' : 'mx-auto max-w-5xl px-5 py-6 sm:px-8'}>
        {/* Profile hero */}
        <div className={`pb-6 ${isAdmin ? 'pt-2' : 'pt-8'}`}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-sm font-semibold text-[var(--background)]">
              {getInitials(contractor.name)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--foreground)]">
                {contractor.name}
              </h1>
              <p className="truncate text-sm text-[var(--muted-foreground)]">
                {contractor.email}
              </p>
            </div>
          </div>
        </div>

        {/* Hero KPI — Total Invoiced */}
        <div className="bg-[#1c1917] px-5 py-4 dark:bg-[#064e3b]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/60">
            Total Invoiced
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-white">
            {kpis.totalInvoiced}
          </div>
          <div className="mt-0.5 text-xs text-white/50">
            {kpis.totalCount} invoice{kpis.totalCount !== 1 ? 's' : ''}
          </div>
          {/* Progress bar: paid vs total */}
          {kpis.paidCount > 0 && kpis.totalCount > 0 && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{
                  width: `${Math.round((kpis.paidCount / kpis.totalCount) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Secondary KPIs */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="border-l-2 border-l-emerald-500 bg-[var(--muted)] px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Paid
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums text-[var(--foreground)]">
              {kpis.totalPaid}
            </div>
            <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {kpis.paidCount} invoice{kpis.paidCount !== 1 ? 's' : ''}
            </div>
          </div>

          {isAdmin ? (
            <div className="border-l-2 border-l-sky-500 bg-[var(--muted)] px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                Submitted
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-[var(--foreground)]">
                {kpis.submittedCount}
              </div>
              {kpis.rejectedCount > 0 && (
                <div className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                  {kpis.rejectedCount} rejected
                </div>
              )}
            </div>
          ) : (
            <div className="border-l-2 border-l-amber-500 bg-[var(--muted)] px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                Outstanding
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-[var(--foreground)]">
                {kpis.outstanding}
              </div>
              <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {kpis.approvedCount} awaiting
              </div>
            </div>
          )}

          <div className="border-l-2 border-l-stone-400 bg-[var(--muted)] px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Tax
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums text-[var(--foreground)]">
              {kpis.totalTax}
            </div>
          </div>
        </div>

        {/* Invoice List */}
        {pending.length > 0 && (
          <section className="mt-10">
            <SectionHeader
              label={isAdmin ? 'Needs Attention' : 'Awaiting Payment'}
              count={pending.length}
              dot="bg-amber-500"
            />
            <div className="divide-y divide-[var(--border)]">
              {pending.map((inv) => (
                <Link
                  key={inv.id}
                  to="/invoices/$id"
                  params={{ id: inv.id }}
                  className={`${invoiceRowClass} border-l-blue-500 dark:border-l-blue-400`}
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
                    trailing={
                      <ChevronRight
                        size={14}
                        className="shrink-0 text-[var(--muted-foreground)]/50"
                      />
                    }
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section className="mt-10">
            <button
              onClick={() => setHistoryExpanded((v) => !v)}
              className="mb-3 flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  {isAdmin ? 'History' : 'Paid'} ({completed.length})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {!historyExpanded && (
                  <span className="text-xs tabular-nums text-[var(--muted-foreground)]">
                    {completed.length} paid &middot;{' '}
                    {formatCurrency(
                      completed.reduce((s, i) => s + i.grandTotalCents, 0) /
                        100,
                      completed[0]?.currencyCode ?? 'USD',
                    )}
                  </span>
                )}
                {historyExpanded ? (
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
                historyExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
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
                        trailing={
                          <ChevronRight
                            size={14}
                            className="shrink-0 text-[var(--muted-foreground)]/50"
                          />
                        }
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {invoices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              No invoices found
            </p>
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-12" />
      </div>
    </div>
  )

  if (isAdmin) {
    return <AdminLayout>{content}</AdminLayout>
  }

  return content
}
