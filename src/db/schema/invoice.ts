import {
  integer,
  real,
  sqliteTable,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { entity } from './entity'

// ─── Invoice ────────────────────────────────────────────────────────

export const invoiceStatusEnum = [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'paid',
] as const
export type InvoiceStatus = (typeof invoiceStatusEnum)[number]

export const invoice = sqliteTable(
  'invoice',
  {
    id: text('id').primaryKey(),
    invoiceNumber: text('invoice_number').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    entityId: text('entity_id')
      .notNull()
      .references(() => entity.id),
    status: text('status', { enum: invoiceStatusEnum })
      .notNull()
      .default('draft'),
    currencyCode: text('currency_code').notNull().default('USD'),
    invoiceDate: integer('invoice_date', { mode: 'timestamp_ms' }).notNull(),
    serviceDate: integer('service_date', { mode: 'timestamp_ms' }),
    dueDate: integer('due_date', { mode: 'timestamp_ms' }),
    // Recipient info (free text, per-invoice)
    billTo: text('bill_to').notNull(),
    clientTaxId: text('client_tax_id'),
    // Sender info (pre-filled from profile, user can override — snapshot)
    companyDetails: text('company_details').notNull(),
    senderTaxId: text('sender_tax_id'),
    bankDetails: text('bank_details'),
    // Content
    notes: text('notes'),
    internalNotes: text('internal_notes'),
    category: text('category'),
    rejectionReason: text('rejection_reason'),
    // Tax display
    taxInclusive: integer('tax_inclusive', { mode: 'boolean' })
      .notNull()
      .default(false),
    taxPercent: integer('tax_percent'),
    // Totals (denormalized, in cents for exact arithmetic)
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    totalTaxCents: integer('total_tax_cents').notNull().default(0),
    grandTotalCents: integer('grand_total_cents').notNull().default(0),
    // Payment info (filled by accountant when marking paid)
    paymentDate: integer('payment_date', { mode: 'timestamp_ms' }),
    paymentMethod: text('payment_method'),
    paymentReference: text('payment_reference'),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => ({
    userIdx: index('invoice_user_id_idx').on(table.userId),
    entityIdx: index('invoice_entity_id_idx').on(table.entityId),
    statusIdx: index('invoice_status_idx').on(table.status),
    invoiceNumberUnique: uniqueIndex('invoice_number_unique').on(
      table.invoiceNumber,
    ),
    entityStatusIdx: index('invoice_entity_status_idx').on(
      table.entityId,
      table.status,
    ),
  }),
)

// ─── Line Items ─────────────────────────────────────────────────────

export const lineItem = sqliteTable(
  'line_item',
  {
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoice.id, { onDelete: 'cascade' }),
    sortIndex: integer('sort_index').notNull().default(0),
    description: text('description').notNull(),
    quantity: real('quantity').notNull().default(1),
    unitCostCents: integer('unit_cost_cents').notNull(),
    amountCents: integer('amount_cents').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => ({
    invoiceIdIdx: index('line_item_invoice_id_idx').on(table.invoiceId),
  }),
)

// ─── Invoice Number Sequence ────────────────────────────────────────

export const invoiceNumberSequence = sqliteTable('invoice_number_sequence', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  nextNumber: integer('next_number').notNull().default(1),
})
