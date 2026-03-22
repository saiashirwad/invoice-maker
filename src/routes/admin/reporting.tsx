import { useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { requireAdmin } from '@/lib/route-auth'
import { getReportingData, getProcessedInvoiceCounts } from '@/lib/invoice-fns'
import { AdminLayout } from '@/components/AdminLayout'
import { formatCurrency } from '@/components/invoice/useInvoice'
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'

const VALID_RANGES = ['all', '1m', '3m', '6m', '12m'] as const

export const Route = createFileRoute('/admin/reporting')({
  beforeLoad: requireAdmin,
  validateSearch: (search: Record<string, unknown>) => ({
    range: VALID_RANGES.includes(search.range as string as (typeof VALID_RANGES)[number])
      ? (search.range as string)
      : 'all',
  }),
  loader: async () => {
    const [report, counts] = await Promise.all([
      getReportingData({ data: {} }),
      getProcessedInvoiceCounts(),
    ])
    return { report, counts }
  },
  component: ReportingPage,
})

// ─── Helpers ─────────────────────────────────────────────────────────

function getPresetRange(preset: string): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().split('T')[0]
  const d = new Date(now)

  switch (preset) {
    case '1m':
      d.setMonth(d.getMonth() - 1)
      break
    case '3m':
      d.setMonth(d.getMonth() - 3)
      break
    case '6m':
      d.setMonth(d.getMonth() - 6)
      break
    case '12m':
      d.setFullYear(d.getFullYear() - 1)
      break
    default:
      d.setFullYear(2000)
  }

  return { from: d.toISOString().split('T')[0], to }
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getMonthKey(timestamp: number | Date): string {
  const d = typeof timestamp === 'number' ? new Date(timestamp) : timestamp
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Show primary currency large, others as secondary annotations */
function CurrencyBreakdown({
  currencies,
  className,
  secondaryClassName,
}: {
  currencies: { code: string; cents: number }[]
  className?: string
  secondaryClassName?: string
}) {
  if (currencies.length === 0) return null

  // Sort by value descending — primary is the largest
  const sorted = [...currencies].sort((a, b) => b.cents - a.cents)
  const [primary, ...rest] = sorted

  return (
    <div>
      <div className={className}>
        {formatCurrency(primary.cents / 100, primary.code)}
      </div>
      {rest.length > 0 && (
        <div
          className={
            secondaryClassName ??
            'mt-0.5 text-xs tabular-nums text-[var(--muted-foreground)]'
          }
        >
          {rest
            .map((c) => formatCurrency(c.cents / 100, c.code))
            .join(' + ')}
        </div>
      )}
    </div>
  )
}

// ─── Bar Row ─────────────────────────────────────────────────────────

function BarRow({
  label,
  value,
  maxVal,
  currencies,
  rank,
}: {
  label: string
  value: number
  maxVal: number
  currencies: { code: string; cents: number }[]
  rank: number
}) {
  const pct = Math.max((value / maxVal) * 100, 0.5)
  // Gentle opacity fade — never below 75% so all bars stay legible
  const barOpacity = rank === 0 ? '' : rank <= 2 ? 'opacity-85' : 'opacity-75'

  const sorted = [...currencies].sort((a, b) => b.cents - a.cents)
  const [primary, ...rest] = sorted

  return (
    <div className="group flex items-center gap-4 py-1.5">
      <div className="w-28 shrink-0 text-right text-[13px] text-[var(--muted-foreground)]">
        {label}
      </div>
      <div className="relative flex-1">
        <div
          className={`h-7 rounded-[3px] bg-[var(--emerald)] transition-all duration-500 ${barOpacity}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-36 shrink-0 text-right">
        <div className="text-[13px] font-medium tabular-nums text-[var(--foreground)]">
          {formatCurrency(primary.cents / 100, primary.code)}
        </div>
        {rest.length > 0 && (
          <div className="text-[11px] tabular-nums text-[var(--muted-foreground)]">
            {rest.map((c) => formatCurrency(c.cents / 100, c.code)).join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Trend Indicator ─────────────────────────────────────────────────

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const pctChange = Math.round(((current - previous) / previous) * 100)
  if (pctChange === 0) return null

  const isUp = pctChange > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
        isUp
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-500 dark:text-red-400'
      }`}
    >
      {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {isUp ? '+' : ''}
      {pctChange}%
    </span>
  )
}

// ─── Main ────────────────────────────────────────────────────────────

function ReportingPage() {
  const { report, counts } = Route.useLoaderData()
  const { invoices, entities } = report
  const entityMap = new Map(entities.map((e) => [e.id, e.name]))
  const { range: preset } = Route.useSearch()
  const navigate = useNavigate()

  const range = preset === 'all' ? null : getPresetRange(preset)

  const filtered = useMemo(() => {
    if (!range) return invoices
    const from = new Date(range.from + 'T00:00:00').getTime()
    const to = new Date(range.to + 'T23:59:59').getTime()
    return invoices.filter((inv) => {
      const ts =
        typeof inv.invoiceDate === 'number'
          ? inv.invoiceDate
          : new Date(inv.invoiceDate).getTime()
      return ts >= from && ts <= to
    })
  }, [invoices, range])

  // ── Aggregations ────────────────────────────────────────

  const byCurrency = useMemo(() => {
    const map = new Map<
      string,
      { totalCents: number; count: number; paidCents: number; paidCount: number }
    >()
    for (const inv of filtered) {
      const curr = inv.currencyCode
      const entry = map.get(curr) ?? {
        totalCents: 0,
        count: 0,
        paidCents: 0,
        paidCount: 0,
      }
      entry.totalCents += inv.grandTotalCents
      entry.count += 1
      if (inv.status === 'paid') {
        entry.paidCents += inv.grandTotalCents
        entry.paidCount += 1
      }
      map.set(curr, entry)
    }
    return map
  }, [filtered])

  const totalCurrencies = useMemo(
    () =>
      Array.from(byCurrency.entries())
        .map(([code, d]) => ({ code, cents: d.totalCents }))
        .sort((a, b) => b.cents - a.cents),
    [byCurrency],
  )

  const paidCurrencies = useMemo(
    () =>
      Array.from(byCurrency.entries())
        .filter(([, d]) => d.paidCents > 0)
        .map(([code, d]) => ({ code, cents: d.paidCents }))
        .sort((a, b) => b.cents - a.cents),
    [byCurrency],
  )

  const paidCount = filtered.filter((i) => i.status === 'paid').length
  const outstandingCount = filtered.length - paidCount

  // Spend by category
  const byCategory = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const inv of filtered) {
      const cat = inv.category || 'Uncategorized'
      const curr = inv.currencyCode
      if (!map.has(cat)) map.set(cat, new Map())
      const currMap = map.get(cat)!
      currMap.set(curr, (currMap.get(curr) ?? 0) + inv.grandTotalCents)
    }
    return Array.from(map.entries())
      .map(([category, currencies]) => ({
        category,
        currencies: Array.from(currencies.entries()).map(([code, cents]) => ({
          code,
          cents,
        })),
        primaryCents: Array.from(currencies.values()).reduce(
          (a, b) => a + b,
          0,
        ),
      }))
      .sort((a, b) => b.primaryCents - a.primaryCents)
  }, [filtered])

  // Monthly trend
  const monthly = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const inv of filtered) {
      const month = getMonthKey(inv.invoiceDate)
      if (!map.has(month)) map.set(month, new Map())
      const currMap = map.get(month)!
      currMap.set(
        inv.currencyCode,
        (currMap.get(inv.currencyCode) ?? 0) + inv.grandTotalCents,
      )
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, currencies]) => ({
        month,
        currencies: Array.from(currencies.entries()).map(([code, cents]) => ({
          code,
          cents,
        })),
        primaryCents: Array.from(currencies.values()).reduce(
          (a, b) => a + b,
          0,
        ),
      }))
  }, [filtered])

  // By entity
  const byEntity = useMemo(() => {
    const map = new Map<
      string,
      { currencies: Map<string, number>; count: number }
    >()
    for (const inv of filtered) {
      const eName = entityMap.get(inv.entityId) ?? inv.entityId
      if (!map.has(eName))
        map.set(eName, { currencies: new Map(), count: 0 })
      const entry = map.get(eName)!
      entry.count += 1
      entry.currencies.set(
        inv.currencyCode,
        (entry.currencies.get(inv.currencyCode) ?? 0) + inv.grandTotalCents,
      )
    }
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      currencies: Array.from(data.currencies.entries())
        .map(([code, cents]) => ({ code, cents }))
        .sort((a, b) => b.cents - a.cents),
    }))
  }, [filtered, entityMap])

  const maxCategoryCents = Math.max(
    ...byCategory.map((c) => c.primaryCents),
    1,
  )
  const maxMonthlyCents = Math.max(...monthly.map((m) => m.primaryCents), 1)

  return (
    <AdminLayout processedCount={counts.all}>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Reporting
        </h2>
        <div className="relative">
          <select
            className="focus-emerald h-9 appearance-none border-b border-[var(--border)]/75 bg-transparent pr-6 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150"
            value={preset}
            onChange={(e) =>
              void navigate({
                search: { range: e.target.value },
                replace: true,
              })
            }
          >
            <option value="all">All Time</option>
            <option value="1m">Last Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="12m">Last 12 Months</option>
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            No invoice data for this period
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* ── KPI Cards ───────────────────────────────────── */}
          <div className="space-y-3">
            {/* Top row: Volume + Paid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Total Volume — hero card */}
              <div className="bg-[#1c1917] px-6 py-5 dark:bg-[#064e3b]">
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                  Total Volume
                </div>
                <CurrencyBreakdown
                  currencies={totalCurrencies}
                  className="mt-2 text-2xl font-semibold tabular-nums text-white"
                  secondaryClassName="mt-1 text-xs tabular-nums text-white/40"
                />
                <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                  <span>{filtered.length} invoices</span>
                  <span className="opacity-40">&middot;</span>
                  <span>
                    {paidCount} paid, {outstandingCount} outstanding
                  </span>
                </div>
              </div>

              {/* Paid */}
              <div className="border border-[var(--border)] px-6 py-5">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Paid
                </div>
                <CurrencyBreakdown
                  currencies={paidCurrencies}
                  className="mt-2 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400"
                />
                {outstandingCount > 0 && (
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${Math.round((paidCount / filtered.length) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom row: Entity breakdown */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {byEntity.map((ent) => {
                const primary = ent.currencies[0]
                const rest = ent.currencies.slice(1)
                return (
                  <div
                    key={ent.name}
                    className="flex items-center justify-between border border-[var(--border)] px-5 py-4"
                  >
                    <div>
                      <div className="text-sm font-medium text-[var(--foreground)]">
                        {ent.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        {ent.count} invoice{ent.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold tabular-nums text-[var(--foreground)]">
                        {primary &&
                          formatCurrency(primary.cents / 100, primary.code)}
                      </div>
                      {rest.length > 0 && (
                        <div className="mt-0.5 text-xs tabular-nums text-[var(--muted-foreground)]">
                          {rest
                            .map((c) =>
                              formatCurrency(c.cents / 100, c.code),
                            )
                            .join(' + ')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Spend by Category ────────────────────────────── */}
          <section>
            <h3 className="mb-6 border-b border-[var(--border)] pb-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Spend by Category
            </h3>
            {byCategory.length > 0 ? (
              <div>
                {byCategory.map((cat, i) => (
                  <BarRow
                    key={cat.category}
                    label={cat.category}
                    value={cat.primaryCents}
                    maxVal={maxCategoryCents}
                    currencies={cat.currencies}
                    rank={i}
                  />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                No categorized invoices
              </p>
            )}
          </section>

          {/* ── Monthly Trend ────────────────────────────────── */}
          <section>
            <h3 className="mb-6 border-b border-[var(--border)] pb-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Monthly Trend
            </h3>
            {monthly.length > 0 ? (
              <div>
                {monthly.map((m, i) => {
                  const prev = i > 0 ? monthly[i - 1].primaryCents : 0
                  return (
                    <div key={m.month} className="flex items-center gap-4 py-1.5">
                      <div className="w-28 shrink-0 text-right text-[13px] text-[var(--muted-foreground)]">
                        {formatMonth(m.month + '-01')}
                      </div>
                      <div className="relative flex-1">
                        <div
                          className="h-7 rounded-[3px] bg-[var(--emerald)] transition-all duration-500"
                          style={{
                            width: `${Math.max((m.primaryCents / maxMonthlyCents) * 100, 0.5)}%`,
                          }}
                        />
                      </div>
                      <div className="w-36 shrink-0 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[13px] font-medium tabular-nums text-[var(--foreground)]">
                            {formatCurrency(
                              m.currencies.sort((a, b) => b.cents - a.cents)[0]
                                .cents / 100,
                              m.currencies.sort((a, b) => b.cents - a.cents)[0]
                                .code,
                            )}
                          </span>
                          {i > 0 && (
                            <TrendBadge
                              current={m.primaryCents}
                              previous={prev}
                            />
                          )}
                        </div>
                        {m.currencies.length > 1 && (
                          <div className="text-[11px] tabular-nums text-[var(--muted-foreground)]">
                            {m.currencies
                              .sort((a, b) => b.cents - a.cents)
                              .slice(1)
                              .map((c) =>
                                formatCurrency(c.cents / 100, c.code),
                              )
                              .join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                No data
              </p>
            )}
          </section>
        </div>
      )}
    </AdminLayout>
  )
}
