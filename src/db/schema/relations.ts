import { relations } from 'drizzle-orm'
import { user, session, account, verification } from './auth'
import { entity, userProfile } from './entity'
import { invoice, lineItem, invoiceNumberSequence } from './invoice'
import { auditLog } from './audit'

export const userRelations = relations(user, ({ one, many }) => ({
  entity: one(entity, {
    fields: [user.entityId],
    references: [entity.id],
  }),
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
  invoices: many(invoice),
  invoiceSequence: one(invoiceNumberSequence, {
    fields: [user.id],
    references: [invoiceNumberSequence.userId],
  }),
  auditLogs: many(auditLog),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const verificationRelations = relations(verification, () => ({
  // better-auth doesn't define relations for verification
}))

export const entityRelations = relations(entity, ({ many }) => ({
  users: many(user),
  invoices: many(invoice),
}))

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}))

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
  user: one(user, {
    fields: [invoice.userId],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [invoice.entityId],
    references: [entity.id],
  }),
  lineItems: many(lineItem),
  auditLogs: many(auditLog),
}))

export const lineItemRelations = relations(lineItem, ({ one }) => ({
  invoice: one(invoice, {
    fields: [lineItem.invoiceId],
    references: [invoice.id],
  }),
}))

export const invoiceNumberSequenceRelations = relations(
  invoiceNumberSequence,
  ({ one }) => ({
    user: one(user, {
      fields: [invoiceNumberSequence.userId],
      references: [user.id],
    }),
  }),
)

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(user, {
    fields: [auditLog.actorId],
    references: [user.id],
  }),
}))

export const allRelations = [
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
]
