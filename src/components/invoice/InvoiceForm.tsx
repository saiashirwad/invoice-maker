import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@tanstack/react-form'
import { Plus, X, Upload, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatCurrency,
  getItemAmount,
  computeDisplayTotals,
  createItem,
} from './useInvoice'
import CurrencyCombobox from './CurrencyCombobox'
import DatePicker from './DatePicker'
import FormLabel, { labelClass } from './FormLabel'

interface InvoiceFormProps {
  form: any
  categories?: string[]
}

const inputClass =
  'focus-emerald w-full h-9 border-b border-[var(--border)]/75 bg-transparent px-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-foreground)]/50 hover:border-[var(--border)]'

const multilineInputClass =
  'focus-emerald-soft min-h-[112px] flex-1 py-3 leading-[1.7] font-normal [field-sizing:content]'

export default function InvoiceForm({
  form,
  categories = [],
}: InvoiceFormProps) {
  const currency = useStore(form.store, (s: any) => s.values.currency)
  const items = useStore(form.store, (s: any) => s.values.items)
  const taxPercent = useStore(form.store, (s: any) => s.values.taxPercent)

  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const prevTotalRef = useRef<number | null>(null)
  const [totalFlash, setTotalFlash] = useState(false)

  const calculations = useMemo(
    () => computeDisplayTotals(items, taxPercent),
    [items, taxPercent],
  )

  useEffect(() => {
    if (
      prevTotalRef.current !== null &&
      prevTotalRef.current !== calculations.total
    ) {
      setTotalFlash(true)
      const t = setTimeout(() => setTotalFlash(false), 600)
      return () => clearTimeout(t)
    }
    prevTotalRef.current = calculations.total
  }, [calculations.total])

  const handleDeleteItem = useCallback((itemsField: any, i: number) => {
    setDeletingIndex(i)
    setTimeout(() => {
      itemsField.removeValue(i)
      setDeletingIndex(null)
    }, 150)
  }, [])

  return (
    <div className="sm:mx-8">
      <div className="space-y-0">
        {/* Logo */}
        <form.Field name="logo">
          {(field: any) => {
            const logo = field.state.value
            const handleLogoUpload = (
              e: React.ChangeEvent<HTMLInputElement>,
            ) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 5 * 1024 * 1024) return
              const reader = new FileReader()
              reader.onload = () => field.handleChange(reader.result as string)
              reader.readAsDataURL(file)
            }

            return (
              <div className="mb-6 flex h-12 items-center justify-end">
                {logo ? (
                  <div className="group relative h-12">
                    <img
                      src={logo}
                      alt="Logo"
                      className="h-12 w-auto max-w-[120px] object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => field.handleChange(null)}
                      aria-label="Remove logo"
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--foreground)] text-[10px] text-[var(--background)] opacity-0 transition group-hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <label
                    className="group inline-flex cursor-pointer items-center gap-2 rounded border-b border-transparent pb-1 text-[11px] font-normal tracking-[0.12em] text-[var(--muted-foreground)] uppercase transition hover:border-[var(--emerald)]/30 hover:text-[var(--foreground)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--emerald)]"
                    aria-label="Upload company logo"
                  >
                    <Upload
                      size={14}
                      className="text-[var(--muted-foreground)] transition group-hover:text-[var(--emerald)]"
                    />
                    <span>Add logo</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                )}
              </div>
            )
          }}
        </form.Field>

        {/* Company details + Tax IDs */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <form.Field name="companyDetails">
              {(field: any) => (
                <div className="flex flex-1 flex-col">
                  <FormLabel htmlFor="company-details">From</FormLabel>
                  <textarea
                    id="company-details"
                    className={cn(inputClass, multilineInputClass)}
                    placeholder="Your company name and address"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      field.handleChange(e.target.value)
                    }
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="senderTaxId">
              {(field: any) => (
                <div>
                  <FormLabel
                    htmlFor="sender-tax-id"
                    tooltip="Your tax or VAT registration number. Required in many jurisdictions for the invoice to be legally valid."
                  >
                    Tax / VAT ID
                  </FormLabel>
                  <input
                    id="sender-tax-id"
                    type="text"
                    className={inputClass}
                    placeholder="e.g. GB 123 4567 89"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      field.handleChange(e.target.value)
                    }
                  />
                </div>
              )}
            </form.Field>
          </div>
          <div className="flex flex-col gap-4">
            <form.Field name="billTo">
              {(field: any) => (
                <div className="flex flex-1 flex-col">
                  <FormLabel htmlFor="bill-to">Bill To</FormLabel>
                  <textarea
                    id="bill-to"
                    className={cn(inputClass, multilineInputClass)}
                    placeholder="Client name and address"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      field.handleChange(e.target.value)
                    }
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="clientTaxId">
              {(field: any) => (
                <div>
                  <FormLabel
                    htmlFor="client-tax-id"
                    tooltip="Your client's tax ID. Needed for B2B invoices in the EU (reverse charge) and many other tax regimes."
                  >
                    Client Tax / VAT ID
                  </FormLabel>
                  <input
                    id="client-tax-id"
                    type="text"
                    className={inputClass}
                    placeholder="Optional"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      field.handleChange(e.target.value)
                    }
                  />
                </div>
              )}
            </form.Field>
          </div>
        </div>

        {/* Currency & Dates — 4 columns */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <form.Field name="currency">
            {(field: any) => (
              <div>
                <FormLabel>Currency</FormLabel>
                <CurrencyCombobox
                  value={field.state.value}
                  onChange={(val: string) => field.handleChange(val)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="invoiceDate">
            {(field: any) => (
              <div>
                <FormLabel htmlFor="invoice-date">Invoice Date</FormLabel>
                <DatePicker
                  id="invoice-date"
                  value={field.state.value}
                  onChange={(val: string) => field.handleChange(val)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="serviceDate">
            {(field: any) => (
              <div>
                <FormLabel
                  htmlFor="service-date"
                  tooltip="When work was performed or goods delivered. Some tax authorities require this separately from the invoice date."
                >
                  Service Date
                </FormLabel>
                <DatePicker
                  id="service-date"
                  value={field.state.value}
                  onChange={(val: string) => field.handleChange(val)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="dueDate">
            {(field: any) => (
              <div>
                <FormLabel htmlFor="due-date">Due Date</FormLabel>
                <DatePicker
                  id="due-date"
                  value={field.state.value}
                  onChange={(val: string) => field.handleChange(val)}
                />
              </div>
            )}
          </form.Field>
        </div>

        {/* Category */}
        {categories.length > 0 && (
          <div className="mt-6">
            <form.Field name="category">
              {(field: any) => (
                <div className="max-w-[200px]">
                  <FormLabel htmlFor="category">Category</FormLabel>
                  <div className="relative">
                    <select
                      id="category"
                      className={cn(inputClass, 'appearance-none pr-6')}
                      value={field.state.value}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        field.handleChange(e.target.value)
                      }
                    >
                      <option value="">None</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                    />
                  </div>
                </div>
              )}
            </form.Field>
          </div>
        )}

        {/* Line items */}
        <form.Field name="items" mode="array">
          {(itemsField: any) => (
            <div className="mt-10 border-t border-[var(--border)] pt-8">
              {/* Table header */}
              <div className="mb-3 hidden items-center gap-3 sm:grid sm:grid-cols-[2.5fr_1fr_0.6fr_0.9fr]">
                <span className={cn(labelClass, 'mb-0')}>Description</span>
                <span className={cn(labelClass, 'mb-0')}>Unit Cost</span>
                <span className={cn(labelClass, 'mb-0')}>Qty</span>
                <span className={cn(labelClass, 'mb-0 text-right')}>
                  Amount
                </span>
              </div>

              {/* Rows */}
              <div>
                {itemsField.state.value.map((_item: any, i: number) => (
                  <div
                    key={_item.id ?? i}
                    className={cn(
                      'group relative grid grid-cols-1 items-center gap-2 border-b border-[var(--border)]/60 pb-3 pt-3 first:pt-0 sm:grid-cols-[2.5fr_1fr_0.6fr_0.9fr] sm:gap-3',
                      _item.id === lastAddedId && 'line-item-enter',
                      deletingIndex === i && 'line-item-exit',
                    )}
                  >
                    <div>
                      <label className={cn(labelClass, 'sm:hidden')}>
                        Description
                      </label>
                      <form.Field name={`items[${i}].description`}>
                        {(field: any) => (
                          <input
                            type="text"
                            data-field="description"
                            className={inputClass}
                            placeholder="Item description"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => field.handleChange(e.target.value)}
                          />
                        )}
                      </form.Field>
                    </div>
                    <div>
                      <label className={cn(labelClass, 'sm:hidden')}>
                        Unit Cost
                      </label>
                      <form.Field name={`items[${i}].unitCost`}>
                        {(field: any) => (
                          <input
                            type="number"
                            className={cn(inputClass, 'tabular-nums')}
                            placeholder="0.00"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => field.handleChange(e.target.value)}
                          />
                        )}
                      </form.Field>
                    </div>
                    <div>
                      <label className={cn(labelClass, 'sm:hidden')}>Qty</label>
                      <form.Field name={`items[${i}].quantity`}>
                        {(field: any) => (
                          <input
                            type="number"
                            className={cn(inputClass, 'tabular-nums')}
                            placeholder="1"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => field.handleChange(e.target.value)}
                          />
                        )}
                      </form.Field>
                    </div>
                    <div>
                      <label className={cn(labelClass, 'sm:hidden')}>
                        Amount
                      </label>
                      <div className="flex h-9 items-center justify-end text-sm tabular-nums text-[var(--muted-foreground)]">
                        {items[i]?.unitCost || items[i]?.quantity
                          ? formatCurrency(getItemAmount(items[i]), currency)
                          : '\u2014'}
                      </div>
                    </div>
                    {/* Delete — floats in right margin gutter (desktop) */}
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleDeleteItem(itemsField, i)}
                      disabled={itemsField.state.value.length === 1}
                      className="absolute -right-9 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--muted-foreground)] opacity-0 transition-all duration-150 hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] group-hover:opacity-100 disabled:pointer-events-none disabled:!opacity-0 sm:flex"
                      aria-label="Delete item"
                    >
                      <X size={13} strokeWidth={2} />
                    </button>
                    {/* Delete — inline on mobile */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(itemsField, i)}
                      disabled={itemsField.state.value.length === 1}
                      className="flex h-10 items-center justify-center rounded-sm border border-[var(--border)] text-xs text-[var(--muted-foreground)] transition hover:border-[var(--destructive)]/30 hover:text-[var(--destructive)] disabled:pointer-events-none disabled:opacity-0 sm:hidden"
                      aria-label="Remove line item"
                    >
                      <X size={12} className="mr-1" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Add item */}
              <button
                type="button"
                onClick={() => {
                  const newItem = createItem()
                  setLastAddedId(newItem.id)
                  itemsField.pushValue(newItem)
                  setTimeout(() => setLastAddedId(null), 300)
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--emerald)]/30 px-3 py-1.5 text-xs font-medium text-[var(--emerald)] transition hover:bg-[var(--emerald)]/5"
                aria-label="Add new line item"
              >
                <Plus size={13} strokeWidth={2.5} />
                Add Item
                <kbd className="rounded bg-[var(--emerald)]/12 px-1 py-0.5 text-[10px] font-normal tracking-wide text-[var(--emerald)]">
                  {typeof navigator !== 'undefined' &&
                  /Mac/.test(navigator.userAgent)
                    ? '\u2318\u21A9'
                    : 'Ctrl+\u21A9'}
                </kbd>
              </button>
            </div>
          )}
        </form.Field>

        {/* Summary */}
        <div className="mt-8 border-t border-[var(--border)] pt-8">
          <div className="ml-auto w-full max-w-[300px] space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--muted-foreground)]">Subtotal</span>
              <span className="tabular-nums text-[var(--foreground)]">
                {formatCurrency(calculations.subtotal, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[13px]">
              <label
                htmlFor="tax-rate"
                className="text-[var(--muted-foreground)]"
              >
                Tax rate (%)
              </label>
              <form.Field name="taxPercent">
                {(field: any) => (
                  <input
                    id="tax-rate"
                    type="number"
                    className={cn(inputClass, 'w-24 text-right tabular-nums')}
                    placeholder="0"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      field.handleChange(e.target.value)
                    }
                  />
                )}
              </form.Field>
            </div>

            <div className="mt-1 border-t-2 border-[var(--foreground)] pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--foreground)]">
                  Total
                </span>
                <span
                  className={cn(
                    'text-[22px] font-semibold tracking-[-0.02em] tabular-nums text-[var(--foreground)] px-1',
                    totalFlash && 'total-flash',
                  )}
                >
                  {formatCurrency(calculations.total, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Bank details */}
        <div className="mt-10 border-t border-[var(--border)] pt-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch">
            <form.Field name="notes">
              {(field: any) => (
                <div className="flex flex-col">
                  <FormLabel htmlFor="notes">Notes / Payment Terms</FormLabel>
                  <textarea
                    id="notes"
                    className={cn(inputClass, multilineInputClass)}
                    placeholder="Payment is due within 15 days"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      field.handleChange(e.target.value)
                    }
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="bankDetails">
              {(field: any) => (
                <div className="flex flex-col">
                  <FormLabel
                    htmlFor="bank-details"
                    tooltip="Where to send the money. Include bank name, IBAN or account number, and SWIFT/BIC if international."
                  >
                    Bank Details
                  </FormLabel>
                  <textarea
                    id="bank-details"
                    className={cn(inputClass, multilineInputClass)}
                    placeholder="Bank name, IBAN, SWIFT/BIC"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      field.handleChange(e.target.value)
                    }
                  />
                </div>
              )}
            </form.Field>
          </div>
        </div>
      </div>
    </div>
  )
}
