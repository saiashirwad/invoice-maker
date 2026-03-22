import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core'
import { user } from './auth'

// ─── Audit Log ──────────────────────────────────────────────────────

export const auditActionEnum = [
  'created',
  'edited',
  'submitted',
  'approved',
  'rejected',
  'paid',
] as const
export type AuditAction = (typeof auditActionEnum)[number]

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    action: text('action', { enum: auditActionEnum }).notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id),
    entityType: text('entity_type', { enum: ['invoice'] }).notNull(),
    entityId: text('entity_id').notNull(),
    details: text('details', { mode: 'json' }),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => ({
    entityTypeEntityIdIdx: index('audit_log_entity_idx').on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    actionIdx: index('audit_log_action_idx').on(table.action, table.createdAt),
    actorIdx: index('audit_log_actor_idx').on(table.actorId, table.createdAt),
  }),
)
