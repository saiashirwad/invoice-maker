import { z } from 'zod'
import { lineItemSchema } from './shared'

export const invoiceFormSchema = z.object({
  logo: z.string().nullable(),
  companyDetails: z.string().min(1, 'Company details are required'),
  senderTaxId: z.string(),
  billTo: z.string().min(1, 'Bill To is required'),
  clientTaxId: z.string(),
  currency: z.string().min(1),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  serviceDate: z.string(),
  dueDate: z.string(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string(),
  bankDetails: z.string(),
  taxPercent: z.string(),
  category: z.string(),
})

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

// --- Cents conversion helpers ---

/** Convert a dollar string (e.g. "45.50") to cents integer (4550) */
export function toCents(dollars: string): number {
  const parsed = parseFloat(dollars)
  if (isNaN(parsed)) return 0
  return Math.round(parsed * 100)
}

/** Convert cents integer (4550) to dollar string ("45.50") */
export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** Convert form line item to DB-ready values */
export function lineItemToDb(
  item: z.infer<typeof lineItemSchema>,
  index: number,
) {
  const unitCostCents = toCents(item.unitCost)
  const quantity = parseFloat(item.quantity) || 0
  const amountCents = Math.round(unitCostCents * quantity)
  return {
    sortIndex: index,
    description: item.description,
    quantity,
    unitCostCents,
    amountCents,
  }
}

/** Compute totals from form values */
export function computeTotals(
  items: z.infer<typeof lineItemSchema>[],
  taxPercent: string,
) {
  const subtotalCents = items.reduce((sum, item) => {
    const unitCostCents = toCents(item.unitCost)
    const qty = parseFloat(item.quantity) || 0
    return sum + Math.round(unitCostCents * qty)
  }, 0)

  const taxRate = parseFloat(taxPercent) || 0
  const totalTaxCents = Math.round(subtotalCents * (taxRate / 100))
  const grandTotalCents = subtotalCents + totalTaxCents

  return { subtotalCents, totalTaxCents, grandTotalCents }
}
