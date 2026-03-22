export interface LineItem {
  id: string
  description: string
  unitCost: string
  quantity: string
}

export interface InvoiceData {
  invoiceNumber: string
  logo: string | null
  companyDetails: string
  senderTaxId: string
  billTo: string
  clientTaxId: string
  currency: string
  invoiceDate: string
  serviceDate: string
  dueDate: string
  items: LineItem[]
  notes: string
  bankDetails: string
  taxPercent: string
  category: string
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function twoWeeksFromNow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 15)
  return d.toISOString().split('T')[0]
}

export function createItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    unitCost: '',
    quantity: '',
  }
}

export function getItemAmount(item: LineItem): number {
  const cost = parseFloat(item.unitCost) || 0
  const qty = parseFloat(item.quantity) || 0
  return cost * qty
}

export function computeDisplayTotals(items: LineItem[], taxPercent: string) {
  const subtotal = items.reduce((sum, item) => sum + getItemAmount(item), 0)
  const taxRate = parseFloat(taxPercent) || 0
  const taxAmount = subtotal * (taxRate / 100)
  return { subtotal, taxAmount, total: subtotal + taxAmount }
}

export type InvoiceFormDefaults = Omit<InvoiceData, 'invoiceNumber'>

const devDefaults: InvoiceFormDefaults = {
  logo: null,
  companyDetails:
    'Northwind Design Co.\n42 Harbour Lane\nLondon EC2A 4NE\nUnited Kingdom',
  senderTaxId: 'GB 284 7291 08',
  billTo:
    'Meridian Labs Inc.\n900 Market Street, Suite 400\nSan Francisco, CA 94102\nUnited States',
  clientTaxId: 'EIN 82-1947263',
  currency: 'GBP',
  invoiceDate: today(),
  serviceDate: today(),
  dueDate: twoWeeksFromNow(),
  items: [
    {
      id: crypto.randomUUID(),
      description: 'Brand Identity Design — Logo, colour palette & style guide',
      unitCost: '4500',
      quantity: '1',
    },
    {
      id: crypto.randomUUID(),
      description: 'Website Development — Next.js marketing site, 8 pages',
      unitCost: '150',
      quantity: '40',
    },
    {
      id: crypto.randomUUID(),
      description: 'Monthly Hosting & Maintenance — March 2026',
      unitCost: '250',
      quantity: '1',
    },
  ],
  notes:
    'Payment is due within 30 days of invoice date.\nLate payments incur 1.5% monthly interest.\nThank you for your business.',
  bankDetails:
    'Barclays Bank UK PLC\nIBAN: GB29 BARC 2038 4729 1846 73\nSWIFT/BIC: BARCGB22\nSort Code: 20-38-47',
  taxPercent: '20',
  category: 'Development',
}

const prodDefaults: InvoiceFormDefaults = {
  logo: null,
  companyDetails: '',
  senderTaxId: '',
  billTo: '',
  clientTaxId: '',
  currency: 'USD',
  invoiceDate: today(),
  serviceDate: '',
  dueDate: twoWeeksFromNow(),
  items: [createItem()],
  notes: 'Payment is due within 15 days',
  bankDetails: '',
  taxPercent: '',
  category: '',
}

export const defaultFormValues: InvoiceFormDefaults = import.meta.env.DEV
  ? devDefaults
  : prodDefaults

export const CURRENCIES: {
  code: string
  symbol: string
  name: string
  flag: string
}[] = [
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
  },
  {
    code: 'EUR',
    symbol: '\u20AC',
    name: 'Euro',
    flag: '\uD83C\uDDEA\uD83C\uDDFA',
  },
  {
    code: 'GBP',
    symbol: '\u00A3',
    name: 'British Pound',
    flag: '\uD83C\uDDEC\uD83C\uDDE7',
  },
  {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    flag: '\uD83C\uDDE8\uD83C\uDDE6',
  },
  {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    flag: '\uD83C\uDDE6\uD83C\uDDFA',
  },
  {
    code: 'JPY',
    symbol: '\u00A5',
    name: 'Japanese Yen',
    flag: '\uD83C\uDDEF\uD83C\uDDF5',
  },
  {
    code: 'INR',
    symbol: '\u20B9',
    name: 'Indian Rupee',
    flag: '\uD83C\uDDEE\uD83C\uDDF3',
  },
  {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    flag: '\uD83C\uDDE7\uD83C\uDDF7',
  },
  {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    flag: '\uD83C\uDDE8\uD83C\uDDED',
  },
  {
    code: 'SEK',
    symbol: 'kr',
    name: 'Swedish Krona',
    flag: '\uD83C\uDDF8\uD83C\uDDEA',
  },
]

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? '$'
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const sym = getCurrencySymbol(currencyCode)
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${sym}${formatted}`
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
