import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm, useStore } from '@tanstack/react-form'
import {
  Download,
  PanelRightClose,
  PanelRight,
  Eye,
  X,
  Loader2,
  Check,
} from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { requireUser } from '@/lib/route-auth'
import { saveInvoice, editInvoice, getUserDefaults, listCategoryNames, getInvoice } from '@/lib/invoice-fns'
import InvoiceForm from '@/components/invoice/InvoiceForm'
import InvoicePreview from '@/components/invoice/InvoicePreview'
import ThemeToggle from '@/components/ThemeToggle'
import {
  defaultFormValues,
  computeDisplayTotals,
  getItemAmount,
  createItem,
} from '@/components/invoice/useInvoice'
import type {
  InvoiceData,
  InvoiceFormDefaults,
} from '@/components/invoice/useInvoice'

export const Route = createFileRoute('/invoices/new')({
  beforeLoad: requireUser,
  validateSearch: (search: Record<string, unknown>) => ({
    duplicate: (search.duplicate as string) || undefined,
    edit: (search.edit as string) || undefined,
  }),
  loaderDeps: ({ search }) => ({ duplicate: search.duplicate, edit: search.edit }),
  loader: async ({ deps }) => {
    const [defaults, categories] = await Promise.all([
      getUserDefaults(),
      listCategoryNames(),
    ])

    let sourceInvoice = null
    const sourceId = deps.edit || deps.duplicate
    if (sourceId) {
      try {
        sourceInvoice = await getInvoice({ data: { id: sourceId } })
      } catch {
        // Invoice not found or no access — ignore
      }
    }

    return { defaults, categories, sourceInvoice, isEdit: !!deps.edit }
  },
  component: NewInvoicePage,
})

function buildCompanyDetails(profile: any, entity: any): string {
  if (!profile && !entity) return ''
  const lines: string[] = []
  if (entity?.name) lines.push(entity.name)
  if (profile?.addressLine1) lines.push(profile.addressLine1)
  if (profile?.addressLine2) lines.push(profile.addressLine2)
  const cityLine = [profile?.city, profile?.state, profile?.postalCode]
    .filter(Boolean)
    .join(', ')
  if (cityLine) lines.push(cityLine)
  if (profile?.country) lines.push(profile.country)
  return lines.join('\n')
}

function buildBankDetails(profile: any): string {
  if (!profile) return ''
  const lines: string[] = []
  if (profile.bankName) lines.push(profile.bankName)
  if (profile.bankAccount) lines.push(`Account: ${profile.bankAccount}`)
  if (profile.bankRouting) lines.push(`Routing: ${profile.bankRouting}`)
  if (profile.bankIban) lines.push(`IBAN: ${profile.bankIban}`)
  if (profile.bankSwift) lines.push(`SWIFT: ${profile.bankSwift}`)
  return lines.join('\n')
}

function NewInvoicePage() {
  const navigate = useNavigate()
  const { defaults, categories, sourceInvoice, isEdit } = Route.useLoaderData()
  const { profile, entity } = defaults

  // Compute initial overrides from profile/entity (stable reference)
  const overrides = useMemo(() => {
    // If editing or duplicating, use source invoice data
    if (sourceInvoice) {
      const inv = sourceInvoice
      return {
        companyDetails: inv.companyDetails,
        senderTaxId: inv.senderTaxId ?? '',
        billTo: inv.billTo,
        clientTaxId: inv.clientTaxId ?? '',
        currency: inv.currencyCode,
        invoiceDate: inv.invoiceDate
          ? new Date(inv.invoiceDate).toISOString().split('T')[0]
          : '',
        serviceDate: inv.serviceDate
          ? new Date(inv.serviceDate).toISOString().split('T')[0]
          : '',
        dueDate: inv.dueDate
          ? new Date(inv.dueDate).toISOString().split('T')[0]
          : '',
        items: inv.lineItems.map((li: any) => ({
          id: crypto.randomUUID(),
          description: li.description,
          unitCost: (li.unitCostCents / 100).toFixed(2),
          quantity: String(li.quantity),
        })),
        notes: inv.notes ?? '',
        bankDetails: inv.bankDetails ?? '',
        taxPercent: inv.taxPercent != null ? String(inv.taxPercent) : '',
        category: inv.category ?? '',
        logo: null,
      } satisfies InvoiceFormDefaults
    }

    const o: Partial<InvoiceFormDefaults> = {}
    const companyDetails = buildCompanyDetails(profile, entity)
    if (companyDetails) o.companyDetails = companyDetails
    if (profile?.taxId) o.senderTaxId = profile.taxId
    if (profile?.currency) o.currency = profile.currency
    if (profile?.defaultCategory) o.category = profile.defaultCategory
    const bankDetails = buildBankDetails(profile)
    if (bankDetails) o.bankDetails = bankDetails
    return o
  }, [profile, entity, sourceInvoice])

  const editInvoiceId = isEdit && sourceInvoice ? sourceInvoice.id : null

  const form = useForm({
    defaultValues: sourceInvoice
      ? (overrides as InvoiceFormDefaults)
      : {
          ...defaultFormValues,
          ...overrides,
        },
    onSubmit: async ({ value }) => {
      try {
        setSaveState('saving')
        if (editInvoiceId) {
          await editInvoice({ data: { id: editInvoiceId, ...value } })
          setSaveState('saved')
          toast.success('Invoice updated')
          setTimeout(() => {
            void navigate({ to: '/invoices/$id', params: { id: editInvoiceId } })
          }, 600)
        } else {
          const result = await saveInvoice({ data: value })
          setSaveState('saved')
          toast.success(`Invoice ${result.invoiceNumber} created`)
          setTimeout(() => {
            void navigate({ to: '/invoices/$id', params: { id: result.id } })
          }, 600)
        }
      } catch (err) {
        setSaveState('idle')
        console.error('[handleSave] error:', err)
        toast.error(
          err instanceof Error ? err.message : 'Failed to save invoice',
        )
      }
    },
  })

  // Subscribe to form values for preview + calculations
  const values = useStore(form.store, (s) => s.values)
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting)

  const calculations = useMemo(
    () => computeDisplayTotals(values.items, values.taxPercent),
    [values.items, values.taxPercent],
  )

  const previewData: InvoiceData = useMemo(
    () => ({
      ...values,
      invoiceNumber: '',
    }),
    [values],
  )

  const [showPreview, setShowPreview] = useState(true)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [formPercent, setFormPercent] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const containerRef = useRef<HTMLDivElement>(null)
  const isDirty = useStore(form.store, (s) => s.isDirty)

  // Unsaved changes warning
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Escape to close mobile preview
  useEffect(() => {
    if (!showMobilePreview) return
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setShowMobilePreview(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showMobilePreview])

  const handlePrint = () => window.print()

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'p') {
        e.preventDefault()
        handlePrint()
      }
      if (mod && e.key === 'Enter') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag !== 'TEXTAREA') {
          e.preventDefault()
          const currentItems = form.state.values.items
          const newItem = createItem()
          form.setFieldValue('items', [...currentItems, newItem] as any)
          requestAnimationFrame(() => {
            const inputs = document.querySelectorAll<HTMLInputElement>(
              'input[data-field="description"]',
            )
            inputs[inputs.length - 1]?.focus()
          })
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [form])

  const clampFormPercent = useCallback((value: number) => {
    setFormPercent(Math.max(30, Math.min(value, 70)))
  }, [])

  const onMouseDown = useCallback(() => {
    setIsDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      clampFormPercent(pct)
    }

    const onMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [clampFormPercent])

  const handleDividerKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        clampFormPercent(formPercent - 4)
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        clampFormPercent(formPercent + 4)
      }
      if (e.key === 'Home') {
        e.preventDefault()
        clampFormPercent(30)
      }
      if (e.key === 'End') {
        e.preventDefault()
        clampFormPercent(70)
      }
    },
    [clampFormPercent, formPercent],
  )

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)] print:hidden">
        <div className="flex h-14 items-center justify-between px-5 sm:px-8">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
              {editInvoiceId ? 'Edit Invoice' : 'New Invoice'}
              {isDirty && (
                <span className="ml-1.5 inline-block h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-[var(--emerald)]" />
              )}
              {values.billTo && (
                <span className="font-normal text-[var(--muted-foreground)]">
                  {' '}
                  &mdash; {values.billTo.split('\n')[0]}
                </span>
              )}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1 pl-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="hidden h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-[var(--foreground)] lg:flex"
                  aria-label={
                    showPreview ? 'Hide invoice preview' : 'Show invoice preview'
                  }
                >
                  {showPreview ? (
                    <PanelRightClose size={15} />
                  ) : (
                    <PanelRight size={15} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                {showPreview ? 'Hide preview' : 'Show preview'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowMobilePreview(true)}
                  aria-label="Preview invoice"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-[var(--foreground)] lg:hidden"
                >
                  <Eye size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Preview invoice
              </TooltipContent>
            </Tooltip>
            <ThemeToggle />
            <span className="mx-1.5 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] px-4 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--accent)]"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Export as PDF <kbd className="ml-1 text-[10px] opacity-60">{typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent) ? '\u2318P' : 'Ctrl+P'}</kbd>
              </TooltipContent>
            </Tooltip>
            <button
              type="button"
              onClick={() => void form.handleSubmit()}
              disabled={isSubmitting || saveState === 'saved'}
              className="flex h-8 items-center gap-1.5 rounded-full bg-[var(--foreground)] px-4 text-xs font-medium text-[var(--background)] transition hover:opacity-[0.85] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : saveState === 'saved' ? (
                <Check size={13} />
              ) : null}
              {isSubmitting ? 'Saving...' : saveState === 'saved' ? 'Saved' : editInvoiceId ? 'Update Invoice' : 'Save Invoice'}
            </button>
          </div>
        </div>
      </header>

      <div ref={containerRef} className="flex print:block">
        <div
          id="invoice-form-panel"
          className="form-panel shrink-0 overflow-y-auto px-5 pt-6 pb-12 print:hidden"
          style={{
            width: showPreview ? `${formPercent}%` : '100%',
            transition: isDragging ? 'none' : 'width 200ms ease',
          }}
        >
          <div
            className="mx-auto"
            style={{ maxWidth: showPreview ? '720px' : '820px' }}
          >
            <InvoiceForm form={form} categories={categories} />
          </div>
        </div>

        {showPreview && (
          <button
            type="button"
            onMouseDown={onMouseDown}
            onDoubleClick={() => setFormPercent(50)}
            onKeyDown={handleDividerKeyDown}
            aria-label="Resize form and preview panels"
            aria-controls="invoice-form-panel invoice-preview-panel"
            aria-valuemin={30}
            aria-valuemax={70}
            aria-valuenow={Math.round(formPercent)}
            aria-valuetext={`${Math.round(formPercent)}% form, ${100 - Math.round(formPercent)}% preview`}
            aria-orientation="vertical"
            role="separator"
            className="group/divider relative hidden h-auto w-4 shrink-0 cursor-col-resize items-stretch justify-center bg-transparent px-0 outline-none focus-visible:ring-0 lg:flex print:hidden"
          >
            <span
              aria-hidden="true"
              className={`absolute left-1/2 top-0 h-full -translate-x-1/2 transition-all duration-150 ${
                isDragging
                  ? 'w-0.5 bg-[var(--emerald)]'
                  : 'w-px bg-[var(--border)] group-hover/divider:w-0.5 group-hover/divider:bg-[var(--muted-foreground)]/30 group-focus-visible/divider:w-0.5 group-focus-visible/divider:bg-[var(--emerald)]'
              }`}
            />
          </button>
        )}

        {showPreview && (
          <div
            id="invoice-preview-panel"
            className="hidden flex-1 lg:block print:block"
          >
            <div className="preview-scroll sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto print:static print:h-auto">
              <div className="flex min-h-full items-start justify-center bg-gradient-to-b from-[var(--muted)] to-[color-mix(in_srgb,var(--muted)_92%,var(--border))] p-10 sm:p-12 pb-14 print:bg-white print:p-10 print:pb-14">
                <InvoicePreview
                  data={previewData}
                  calculations={calculations}
                  getItemAmount={getItemAmount}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {showMobilePreview && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/55 backdrop-blur-lg animate-in fade-in duration-200 lg:hidden print:hidden"
          onClick={() => setShowMobilePreview(false)}
        >
          <div
            className="relative m-4 mt-6 w-full max-w-[640px] animate-in slide-in-from-bottom-6 fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowMobilePreview(false)}
              aria-label="Close preview"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--background)] shadow-lg hover:opacity-80"
            >
              <X size={14} />
            </button>
            <InvoicePreview
              data={previewData}
              calculations={calculations}
              getItemAmount={getItemAmount}
            />
          </div>
        </div>
      )}
    </div>
  )
}
