2 entities
SV and LP. you can name them

## Drizzle ORM

Using v0.45.1 stable (not v1.0.0-beta). v1 beta is at 98% with `defineRelations()` as the main new API. When v1 stable ships, mechanical upgrade: convert `relations.ts` → `defineRelations()`, pass `{ relations }` instead of `{ schema }` to `drizzle()`. No rush.

Note: `db.transaction()` does NOT work on D1 (Cloudflare limitation — no `BEGIN/COMMIT` support). Use D1's `batch()` API for atomic multi-statement operations.

### Invoice number sequence (atomic increment)

```sql
UPDATE invoice_number_sequence SET next_number = next_number + 1 WHERE user_id = ? RETURNING next_number
```

Single statement — atomic increment + return. Then use the returned number to insert the invoice as a separate call. Safe because D1 is single-threaded (one Durable Object per DB). If we ever need true single-trip atomicity (increment + insert together), use `env.DB.batch()` — but can't use RETURNING result as bind param within the same batch, so two calls is the practical approach.

## Schema decisions

### Money as integer cents

All monetary values stored as `INTEGER` (cents) — unitCostCents, amountCents, subtotalCents, totalTaxCents, grandTotalCents. Floating point can't represent $0.01 exactly. Quantity is `REAL` (not money, acceptable imprecision). App converts on save/read.

### Snapshot pattern for invoice sender fields

Entity/user_profile has structured fields (address, bank details, tax ID). On invoice creation, these render into plain text strings and pre-fill the form. User can override. The invoice stores whatever they saved as plain text (companyDetails, senderTaxId, bankDetails). Immutable per-invoice — entity updates don't affect old invoices.

### Single tax field for now

Invoice has one `taxPercent` field. Multi-tax lines (federal + state etc) deferred to later. See open-questions.md.

### Schema organization

No barrel files. Direct imports only.

```
src/db/
  index.ts              # createDb() + type exports
  schema/
    auth.ts             # user, session, account, verification + authSchema
    entity.ts           # entity, user_profile
    invoice.ts          # invoice, line_item, invoice_number_sequence
    audit.ts            # audit_log
    relations.ts        # ALL relations() in one file (avoids circular imports)
src/lib/auth.ts         # Better Auth setup + getAuth()/getServerSession(); no table definitions
```
