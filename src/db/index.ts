import { drizzle } from 'drizzle-orm/d1'
import { user, session, account, verification } from './schema/auth'
import { entity, userProfile } from './schema/entity'
import { invoice, lineItem, invoiceNumberSequence } from './schema/invoice'
import { auditLog } from './schema/audit'
import {
  userRelations,
  sessionRelations,
  accountRelations,
  verificationRelations,
  entityRelations,
  userProfileRelations,
  invoiceRelations,
  lineItemRelations,
  invoiceNumberSequenceRelations,
  auditLogRelations,
} from './schema/relations'

const schema = {
  // Tables
  user,
  session,
  account,
  verification,
  entity,
  userProfile,
  invoice,
  lineItem,
  auditLog,
  invoiceNumberSequence,
  // Relations (Drizzle auto-discovers these from the schema object)
  userRelations,
  sessionRelations,
  accountRelations,
  verificationRelations,
  entityRelations,
  userProfileRelations,
  invoiceRelations,
  lineItemRelations,
  invoiceNumberSequenceRelations,
  auditLogRelations,
}

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export type Database = ReturnType<typeof createDb>
