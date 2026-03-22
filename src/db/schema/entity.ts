import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'

export const entity = sqliteTable('entity', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  bankRouting: text('bank_routing'),
  bankSwift: text('bank_swift'),
  bankIban: text('bank_iban'),
  addressLine1: text('address_line_1'),
  addressLine2: text('address_line_2'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  taxId: text('tax_id'),
  logoKey: text('logo_key'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const userProfile = sqliteTable('user_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  // Tax settings (JSON array of tax lines)
  taxSettings: text('tax_settings', { mode: 'json' }),
  taxId: text('tax_id'),
  // Contractor address (pre-fills "From" on invoices)
  addressLine1: text('address_line_1'),
  addressLine2: text('address_line_2'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  // Contractor bank details (for receiving payment)
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  bankRouting: text('bank_routing'),
  bankSwift: text('bank_swift'),
  bankIban: text('bank_iban'),
  // Defaults for invoice creation
  defaultCategory: text('default_category'),
  currency: text('currency').default('USD'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})
