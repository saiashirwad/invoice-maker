import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Route as RootRoute } from '@/routes/__root'
import { requireUser } from '@/lib/route-auth'
import { getUserProfile, saveUserProfile } from '@/lib/invoice-fns'
import { UserMenu } from '@/components/UserMenu'
import { Button } from '@/components/ui/button'
import CurrencyCombobox from '@/components/invoice/CurrencyCombobox'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/settings')({
  beforeLoad: requireUser,
  loader: async () => {
    const { profile } = await getUserProfile()
    return { profile }
  },
  component: SettingsPage,
})

const inputClass =
  'focus-emerald w-full h-9 border-b border-[var(--border)]/75 bg-transparent px-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-foreground)]/50 hover:border-[var(--border)]'

const labelClass =
  'mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-5 border-b border-[var(--border)] pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
      {children}
    </h2>
  )
}

function SettingsPage() {
  const { session } = RootRoute.useRouteContext()
  const { profile } = Route.useLoaderData()

  const taxSettings = profile?.taxSettings
    ? typeof profile.taxSettings === 'string'
      ? JSON.parse(profile.taxSettings)
      : profile.taxSettings
    : null

  const [form, setForm] = useState({
    addressLine1: profile?.addressLine1 ?? '',
    addressLine2: profile?.addressLine2 ?? '',
    city: profile?.city ?? '',
    state: profile?.state ?? '',
    postalCode: profile?.postalCode ?? '',
    country: profile?.country ?? '',
    bankName: profile?.bankName ?? '',
    bankAccount: profile?.bankAccount ?? '',
    bankRouting: profile?.bankRouting ?? '',
    bankSwift: profile?.bankSwift ?? '',
    bankIban: profile?.bankIban ?? '',
    taxId: profile?.taxId ?? '',
    defaultTaxRate: taxSettings?.defaultRate ?? '',
    currency: profile?.currency ?? 'USD',
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!session?.user) return null

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveUserProfile({ data: form })
      setSaved(true)
      toast.success('Settings saved')
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save settings',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/user"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <ArrowLeft size={15} />
            </Link>
            <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
              Settings
            </h1>
          </div>
          <UserMenu name={session.user.name} email={session.user.email} />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <form onSubmit={(e) => void handleSave(e)}>
          {/* ── Personal Info ──────────────────────────────── */}
          <section className="mb-10">
            <SectionTitle>Personal Info</SectionTitle>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Name</label>
                <div className="flex h-9 items-center text-sm text-[var(--foreground)]">
                  {session.user.name}
                </div>
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <div className="flex h-9 items-center text-sm text-[var(--muted-foreground)]">
                  {session.user.email}
                </div>
              </div>
            </div>
          </section>

          {/* ── Address ──────────────────────────────────── */}
          <section className="mb-10">
            <SectionTitle>Address</SectionTitle>
            <p className="mb-5 text-xs text-[var(--muted-foreground)]">
              Pre-fills the "From" section on your invoices.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="addr1" className={labelClass}>
                  Address Line 1
                </label>
                <input
                  id="addr1"
                  type="text"
                  className={inputClass}
                  placeholder="123 Main Street"
                  value={form.addressLine1}
                  onChange={(e) => update('addressLine1', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="addr2" className={labelClass}>
                  Address Line 2
                </label>
                <input
                  id="addr2"
                  type="text"
                  className={inputClass}
                  placeholder="Suite 400"
                  value={form.addressLine2}
                  onChange={(e) => update('addressLine2', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="city" className={labelClass}>
                    City
                  </label>
                  <input
                    id="city"
                    type="text"
                    className={inputClass}
                    placeholder="London"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="state" className={labelClass}>
                    State / Region
                  </label>
                  <input
                    id="state"
                    type="text"
                    className={inputClass}
                    placeholder="England"
                    value={form.state}
                    onChange={(e) => update('state', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="postal" className={labelClass}>
                    Postal Code
                  </label>
                  <input
                    id="postal"
                    type="text"
                    className={inputClass}
                    placeholder="EC2A 4NE"
                    value={form.postalCode}
                    onChange={(e) => update('postalCode', e.target.value)}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="country" className={labelClass}>
                    Country
                  </label>
                  <input
                    id="country"
                    type="text"
                    className={inputClass}
                    placeholder="United Kingdom"
                    value={form.country}
                    onChange={(e) => update('country', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── Bank Details ─────────────────────────────── */}
          <section className="mb-10">
            <SectionTitle>Bank Details</SectionTitle>
            <p className="mb-5 text-xs text-[var(--muted-foreground)]">
              For receiving payments. Shown on your invoices.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="bank-name" className={labelClass}>
                  Bank Name
                </label>
                <input
                  id="bank-name"
                  type="text"
                  className={inputClass}
                  placeholder="Barclays Bank UK PLC"
                  value={form.bankName}
                  onChange={(e) => update('bankName', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="bank-account" className={labelClass}>
                    Account Number
                  </label>
                  <input
                    id="bank-account"
                    type="text"
                    className={inputClass}
                    placeholder="12345678"
                    value={form.bankAccount}
                    onChange={(e) => update('bankAccount', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="bank-routing" className={labelClass}>
                    Routing / Sort Code
                  </label>
                  <input
                    id="bank-routing"
                    type="text"
                    className={inputClass}
                    placeholder="20-38-47"
                    value={form.bankRouting}
                    onChange={(e) => update('bankRouting', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="bank-iban" className={labelClass}>
                    IBAN
                  </label>
                  <input
                    id="bank-iban"
                    type="text"
                    className={inputClass}
                    placeholder="GB29 BARC 2038 4729 1846 73"
                    value={form.bankIban}
                    onChange={(e) => update('bankIban', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="bank-swift" className={labelClass}>
                    SWIFT / BIC
                  </label>
                  <input
                    id="bank-swift"
                    type="text"
                    className={inputClass}
                    placeholder="BARCGB22"
                    value={form.bankSwift}
                    onChange={(e) => update('bankSwift', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── Tax Settings ─────────────────────────────── */}
          <section className="mb-10">
            <SectionTitle>Tax Settings</SectionTitle>
            <p className="mb-5 text-xs text-[var(--muted-foreground)]">
              Auto-applied when you create a new invoice.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="tax-id" className={labelClass}>
                  Tax / VAT ID
                </label>
                <input
                  id="tax-id"
                  type="text"
                  className={inputClass}
                  placeholder="GB 123 4567 89"
                  value={form.taxId}
                  onChange={(e) => update('taxId', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="default-tax" className={labelClass}>
                  Default Tax Rate (%)
                </label>
                <input
                  id="default-tax"
                  type="number"
                  className={`${inputClass} tabular-nums`}
                  placeholder="0"
                  value={form.defaultTaxRate}
                  onChange={(e) => update('defaultTaxRate', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* ── Default Currency ──────────────────────────── */}
          <section className="mb-10">
            <SectionTitle>Default Currency</SectionTitle>
            <div className="max-w-[200px]">
              <CurrencyCombobox
                value={form.currency}
                onChange={(val: string) => update('currency', val)}
              />
            </div>
          </section>

          {/* ── Save ─────────────────────────────────────── */}
          <div className="border-t border-[var(--border)] pt-6">
            <Button type="submit" disabled={saving || saved}>
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check size={14} />
                  Saved
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
