import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm'
import { getDb } from './db-middleware'
import { getServerSession } from './auth'
import { invoice, lineItem, invoiceNumberSequence } from '#/db/schema/invoice'
import { category as categoryTable } from '#/db/schema/category'
import { entity, userProfile  } from '#/db/schema/entity'
import { user } from '#/db/schema/auth'
import { auditLog } from '#/db/schema/audit'
import {
  invoiceFormSchema,
  lineItemToDb,
  computeTotals,
} from '#/forms/schemas/invoice'

// ─── Save Invoice ───────────────────────────────────────────────────

export const saveInvoice = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: unknown }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')
    const creator = session.user as { role?: string }
    if (creator.role !== 'user')
      throw new Error('Only contractors can create invoices')

    // Validate input
    const parsed = invoiceFormSchema.parse(data)

    const db = getDb()
    const userId = session.user.id
    const now = new Date()

    // Atomic invoice number: find max existing number for this prefix+year
    const prefix =
      (session.user as { invoicePrefix?: string }).invoicePrefix ?? ''
    const year = new Date(parsed.invoiceDate + 'T00:00:00').getFullYear()
    const likePattern = `${prefix}-${year}-%`

    const maxRow = await db
      .select({ invoiceNumber: invoice.invoiceNumber })
      .from(invoice)
      .where(sql`${invoice.invoiceNumber} LIKE ${likePattern}`)
      .orderBy(sql`${invoice.invoiceNumber} DESC`)
      .limit(1)
      .get()

    let nextNumber = 1
    if (maxRow) {
      const parts = maxRow.invoiceNumber.split('-')
      const lastNum = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(lastNum)) nextNumber = lastNum + 1
    }

    const invoiceNumber = `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`

    // Compute totals
    const totals = computeTotals(parsed.items, parsed.taxPercent)

    const invoiceId = crypto.randomUUID()

    // Prepare line item rows
    const lineItemRows = parsed.items.map((item, index) => {
      const dbItem = lineItemToDb(item, index)
      return {
        id: crypto.randomUUID(),
        invoiceId,
        ...dbItem,
        createdAt: now,
        updatedAt: now,
      }
    })

    // Insert invoice
    await db.insert(invoice).values({
      id: invoiceId,
      invoiceNumber,
      userId,
      entityId: (session.user as { entityId?: string }).entityId ?? '',
      status: 'draft',
      currencyCode: parsed.currency,
      invoiceDate: new Date(parsed.invoiceDate + 'T00:00:00'),
      serviceDate: parsed.serviceDate
        ? new Date(parsed.serviceDate + 'T00:00:00')
        : null,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate + 'T00:00:00') : null,
      billTo: parsed.billTo,
      clientTaxId: parsed.clientTaxId || null,
      companyDetails: parsed.companyDetails,
      senderTaxId: parsed.senderTaxId || null,
      bankDetails: parsed.bankDetails || null,
      notes: parsed.notes || null,
      category: parsed.category || null,
      taxPercent: parsed.taxPercent ? parseInt(parsed.taxPercent) : null,
      ...totals,
      createdAt: now,
      updatedAt: now,
    })

    // Insert line items
    for (const row of lineItemRows) {
      await db.insert(lineItem).values(row)
    }

    // Update sequence to stay in sync
    const seqExists = await db
      .select()
      .from(invoiceNumberSequence)
      .where(eq(invoiceNumberSequence.userId, userId))
      .get()
    if (seqExists) {
      await db
        .update(invoiceNumberSequence)
        .set({ nextNumber: nextNumber + 1 })
        .where(eq(invoiceNumberSequence.userId, userId))
    } else {
      await db
        .insert(invoiceNumberSequence)
        .values({ userId, nextNumber: nextNumber + 1 })
    }

    // Audit log
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      action: 'created',
      actorId: userId,
      entityType: 'invoice',
      entityId: invoiceId,
      details: { invoiceNumber },
      createdAt: now,
    })

    return { id: invoiceId, invoiceNumber }
  },
)

// ─── Edit Invoice (update a draft) ───────────────────────────────────

export const editInvoice = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string } & Record<string, unknown> }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')
    const creator = session.user as { role?: string }
    if (creator.role !== 'user')
      throw new Error('Only contractors can edit invoices')

    const db = getDb()
    const existing = await db.query.invoice.findFirst({
      where: eq(invoice.id, data.id),
    })

    if (!existing) throw new Error('Invoice not found')
    if (existing.userId !== session.user.id) throw new Error('Forbidden')
    if (existing.status !== 'draft')
      throw new Error('Only draft invoices can be edited')

    const parsed = invoiceFormSchema.parse(data)
    const now = new Date()
    const totals = computeTotals(parsed.items, parsed.taxPercent)

    // Update the invoice
    await db
      .update(invoice)
      .set({
        currencyCode: parsed.currency,
        invoiceDate: new Date(parsed.invoiceDate + 'T00:00:00'),
        serviceDate: parsed.serviceDate
          ? new Date(parsed.serviceDate + 'T00:00:00')
          : null,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate + 'T00:00:00') : null,
        billTo: parsed.billTo,
        clientTaxId: parsed.clientTaxId || null,
        companyDetails: parsed.companyDetails,
        senderTaxId: parsed.senderTaxId || null,
        bankDetails: parsed.bankDetails || null,
        notes: parsed.notes || null,
        category: parsed.category || null,
        taxPercent: parsed.taxPercent ? parseInt(parsed.taxPercent) : null,
        ...totals,
        updatedAt: now,
      })
      .where(eq(invoice.id, data.id))

    // Delete old line items and insert new ones
    await db.delete(lineItem).where(eq(lineItem.invoiceId, data.id))

    for (const [index, item] of parsed.items.entries()) {
      const dbItem = lineItemToDb(item, index)
      await db.insert(lineItem).values({
        id: crypto.randomUUID(),
        invoiceId: data.id,
        ...dbItem,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Audit log
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      action: 'edited',
      actorId: session.user.id,
      entityType: 'invoice',
      entityId: data.id,
      details: { invoiceNumber: existing.invoiceNumber },
      createdAt: now,
    })

    return { id: data.id, invoiceNumber: existing.invoiceNumber }
  },
)

// ─── Get Invoice ────────────────────────────────────────────────────

export const getInvoice = createServerFn({ method: 'GET' }).handler(
  async ({ data }: { data: { id: string } }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const db = getDb()

    const result = await db.query.invoice.findFirst({
      where: eq(invoice.id, data.id),
      with: {
        lineItems: {
          orderBy: (li, { asc }) => [asc(li.sortIndex)],
        },
      },
    })

    if (!result) throw new Error('Invoice not found')

    // Verify access: owner, admin, or accountant for same entity
    const caller = session.user as {
      id: string
      role?: string
      entityId?: string
    }
    const isOwner = result.userId === caller.id
    const isAdmin = caller.role === 'admin'
    const isEntityAccountant =
      caller.role === 'accountant' && result.entityId === caller.entityId
    if (!isOwner && !isAdmin && !isEntityAccountant) {
      throw new Error('Forbidden')
    }

    // Fetch audit log entries for this invoice
    const logs = await db
      .select({
        action: auditLog.action,
        actorId: auditLog.actorId,
        actorName: user.name,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(user, eq(auditLog.actorId, user.id))
      .where(
        and(eq(auditLog.entityType, 'invoice'), eq(auditLog.entityId, data.id)),
      )
      .orderBy(auditLog.createdAt)

    const timeline = logs.map((log) => ({
      action: log.action,
      actorName: log.actorName ?? 'Unknown',
      createdAt: log.createdAt,
    }))

    return { ...result, timeline }
  },
)

// ─── Get User Defaults (profile + entity) ───────────────────────────

export const getUserDefaults = createServerFn({ method: 'GET' }).handler(
  async (): Promise<any> => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const db = getDb()
    const userId = session.user.id
    const entityId = (session.user as { entityId?: string }).entityId

    const profile = await db.query.userProfile.findFirst({
      where: (up, { eq }) => eq(up.userId, userId),
    })

    const entityData = entityId
      ? await db.query.entity.findFirst({
          where: (e, { eq }) => eq(e.id, entityId),
        })
      : null

    return { profile: profile ?? null, entity: entityData ?? null }
  },
)

// ─── List Invoices ─────────────────────────────────────────────────

export const listInvoices = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const db = getDb()

    const results = await db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        billTo: invoice.billTo,
        currencyCode: invoice.currencyCode,
        grandTotalCents: invoice.grandTotalCents,
        invoiceDate: invoice.invoiceDate,
        createdAt: invoice.createdAt,
      })
      .from(invoice)
      .where(eq(invoice.userId, session.user.id))
      .orderBy(desc(invoice.createdAt))

    return results
  },
)

// ─── Submit Invoice (draft → submitted) ─────────────────────────────

export const submitInvoice = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string } }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const db = getDb()
    const result = await db.query.invoice.findFirst({
      where: eq(invoice.id, data.id),
    })

    if (!result) throw new Error('Invoice not found')
    if (result.userId !== session.user.id) throw new Error('Forbidden')
    if (result.status !== 'draft')
      throw new Error('Only draft invoices can be submitted')

    await db
      .update(invoice)
      .set({ status: 'submitted', updatedAt: new Date() })
      .where(eq(invoice.id, data.id))

    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      action: 'submitted',
      actorId: session.user.id,
      entityType: 'invoice',
      entityId: data.id,
      details: { invoiceNumber: result.invoiceNumber },
      createdAt: new Date(),
    })

    return { status: 'submitted' as const }
  },
)

// ─── Approve Invoice (submitted → approved) ─────────────────────────

export const approveInvoice = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string } }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()
    const result = await db.query.invoice.findFirst({
      where: eq(invoice.id, data.id),
    })

    if (!result) throw new Error('Invoice not found')
    if (result.status !== 'submitted')
      throw new Error('Only submitted invoices can be approved')

    await db
      .update(invoice)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(invoice.id, data.id))

    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      action: 'approved',
      actorId: actor.id,
      entityType: 'invoice',
      entityId: data.id,
      details: { invoiceNumber: result.invoiceNumber },
      createdAt: new Date(),
    })

    return { status: 'approved' as const }
  },
)

// ─── Reject Invoice (submitted → rejected) ──────────────────────────

export const rejectInvoice = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string; reason?: string } }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()
    const result = await db.query.invoice.findFirst({
      where: eq(invoice.id, data.id),
    })

    if (!result) throw new Error('Invoice not found')
    if (result.status !== 'submitted')
      throw new Error('Only submitted invoices can be rejected')

    await db
      .update(invoice)
      .set({
        status: 'rejected',
        rejectionReason: data.reason || null,
        updatedAt: new Date(),
      })
      .where(eq(invoice.id, data.id))

    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      action: 'rejected',
      actorId: actor.id,
      entityType: 'invoice',
      entityId: data.id,
      details: { invoiceNumber: result.invoiceNumber },
      createdAt: new Date(),
    })

    return { status: 'rejected' as const }
  },
)

// ─── List All Invoices (admin) ──────────────────────────────────────

export const listAdminInvoices = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()

    const results = await db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        billTo: invoice.billTo,
        companyDetails: invoice.companyDetails,
        currencyCode: invoice.currencyCode,
        grandTotalCents: invoice.grandTotalCents,
        subtotalCents: invoice.subtotalCents,
        totalTaxCents: invoice.totalTaxCents,
        taxPercent: invoice.taxPercent,
        invoiceDate: invoice.invoiceDate,
        rejectionReason: invoice.rejectionReason,
        createdAt: invoice.createdAt,
        userId: invoice.userId,
        userName: user.name,
      })
      .from(invoice)
      .leftJoin(user, eq(invoice.userId, user.id))
      .where(ne(invoice.status, 'draft'))
      .orderBy(desc(invoice.createdAt))

    return results
  },
)

// ─── List Pending Invoices (admin) ───────────────────────────────────

export const listPendingInvoices = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()

    const results = await db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        billTo: invoice.billTo,
        companyDetails: invoice.companyDetails,
        currencyCode: invoice.currencyCode,
        grandTotalCents: invoice.grandTotalCents,
        subtotalCents: invoice.subtotalCents,
        totalTaxCents: invoice.totalTaxCents,
        taxPercent: invoice.taxPercent,
        invoiceDate: invoice.invoiceDate,
        rejectionReason: invoice.rejectionReason,
        createdAt: invoice.createdAt,
        userId: invoice.userId,
        userName: user.name,
        entityId: invoice.entityId,
        entityName: entity.name,
      })
      .from(invoice)
      .leftJoin(user, eq(invoice.userId, user.id))
      .leftJoin(entity, eq(invoice.entityId, entity.id))
      .where(eq(invoice.status, 'submitted'))
      .orderBy(desc(invoice.createdAt))

    return results
  },
)

// ─── List Processed Invoices (admin, paginated) ─────────────────────

const PROCESSED_PAGE_SIZE = 25

export const listProcessedInvoices = createServerFn({ method: 'GET' }).handler(
  async ({
    data,
  }: {
    data: {
      status?: string
      cursor?: string
      limit?: number
      userId?: string
      category?: string
      dateFrom?: string // ISO date string YYYY-MM-DD
      dateTo?: string // ISO date string YYYY-MM-DD
      sortBy?: 'date' | 'amount' | 'user'
      sortDir?: 'asc' | 'desc'
    }
  }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()
    const limit = data.limit ?? PROCESSED_PAGE_SIZE

    const conditions = [ne(invoice.status, 'draft')]

    // Status filter
    if (data.status && data.status !== 'all') {
      conditions.push(eq(invoice.status, data.status))
    } else {
      conditions.push(
        or(
          eq(invoice.status, 'approved'),
          eq(invoice.status, 'rejected'),
          eq(invoice.status, 'paid'),
        )!,
      )
    }

    // User filter
    if (data.userId) {
      conditions.push(eq(invoice.userId, data.userId))
    }

    // Category filter
    if (data.category) {
      conditions.push(eq(invoice.category, data.category))
    }

    // Date range filter (on invoiceDate)
    if (data.dateFrom) {
      conditions.push(
        gte(invoice.invoiceDate, new Date(data.dateFrom + 'T00:00:00')),
      )
    }
    if (data.dateTo) {
      conditions.push(
        lte(invoice.invoiceDate, new Date(data.dateTo + 'T23:59:59')),
      )
    }

    // Cursor-based pagination: cursor is "createdAt:id"
    if (data.cursor) {
      const [cursorTs, cursorId] = data.cursor.split(':')
      const ts = Number(cursorTs)
      conditions.push(
        or(
          lt(invoice.createdAt, ts),
          and(eq(invoice.createdAt, ts), lt(invoice.id, cursorId)),
        )!,
      )
    }

    // Sort
    const sortDir = data.sortDir === 'asc' ? asc : desc
    const sortColumn =
      data.sortBy === 'amount'
        ? invoice.grandTotalCents
        : data.sortBy === 'user'
          ? user.name
          : invoice.createdAt

    // Fetch limit + 1 to know if there are more
    const results = await db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        billTo: invoice.billTo,
        companyDetails: invoice.companyDetails,
        currencyCode: invoice.currencyCode,
        grandTotalCents: invoice.grandTotalCents,
        subtotalCents: invoice.subtotalCents,
        totalTaxCents: invoice.totalTaxCents,
        taxPercent: invoice.taxPercent,
        invoiceDate: invoice.invoiceDate,
        rejectionReason: invoice.rejectionReason,
        category: invoice.category,
        createdAt: invoice.createdAt,
        userId: invoice.userId,
        userName: user.name,
        entityId: invoice.entityId,
        entityName: entity.name,
      })
      .from(invoice)
      .leftJoin(user, eq(invoice.userId, user.id))
      .leftJoin(entity, eq(invoice.entityId, entity.id))
      .where(and(...conditions))
      .orderBy(sortDir(sortColumn), desc(invoice.id))
      .limit(limit + 1)

    const hasMore = results.length > limit
    const items = hasMore ? results.slice(0, limit) : results
    const nextCursor =
      hasMore && items.length > 0
        ? `${items[items.length - 1].createdAt}:${items[items.length - 1].id}`
        : null

    return { items, nextCursor, hasMore }
  },
)

// ─── List Contractors (admin — for filter dropdowns) ─────────────────

export const listContractors = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()
    const results = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.role, 'user'))
      .orderBy(asc(user.name))

    return results
  },
)

// ─── List Distinct Categories (admin — for filter dropdowns) ────────

export const listCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()
    const results = await db
      .select({
        id: categoryTable.id,
        name: categoryTable.name,
        invoiceCount: sql<number>`(
          SELECT COUNT(*) FROM ${invoice}
          WHERE ${invoice.category} = ${categoryTable.name}
        )`.as('invoice_count'),
      })
      .from(categoryTable)
      .orderBy(asc(categoryTable.sortOrder))

    return results
  },
)

// ─── List Category Names (any authenticated user) ───────────────────

export const listCategoryNames = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const db = getDb()
    const results = await db
      .select({ name: categoryTable.name })
      .from(categoryTable)
      .orderBy(asc(categoryTable.sortOrder))

    return results.map((r) => r.name)
  },
)

// ─── Category CRUD (admin) ───────────────────────────────────────────

export const createCategory = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { name: string } }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const name = data.name.trim()
    if (!name) throw new Error('Category name is required')

    const db = getDb()
    const now = Date.now()

    // Get max sort order
    const maxRow = await db
      .select({
        max: sql<number>`COALESCE(MAX(${categoryTable.sortOrder}), 0)`,
      })
      .from(categoryTable)
      .get()
    const nextOrder = (maxRow?.max ?? 0) + 1

    const id = `cat-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
    await db.insert(categoryTable).values({
      id,
      name,
      sortOrder: nextOrder,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    })

    return { id, name }
  },
)

export const deleteCategory = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string } }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()
    await db.delete(categoryTable).where(eq(categoryTable.id, data.id))

    return { ok: true }
  },
)

export const renameCategory = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string; name: string } }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const name = data.name.trim()
    if (!name) throw new Error('Category name is required')

    const db = getDb()
    await db
      .update(categoryTable)
      .set({ name, updatedAt: new Date() })
      .where(eq(categoryTable.id, data.id))

    return { id: data.id, name }
  },
)

// ─── Get Processed Invoice Counts (admin) ───────────────────────────

export const getProcessedInvoiceCounts = createServerFn({
  method: 'GET',
}).handler(async () => {
  const session = await getServerSession(getRequest())
  if (!session?.user) throw new Error('Unauthorized')

  const actor = session.user as { id: string; role?: string }
  if (actor.role !== 'admin') throw new Error('Forbidden')

  const db = getDb()

  const rows = await db
    .select({
      status: invoice.status,
      count: count(),
    })
    .from(invoice)
    .where(and(ne(invoice.status, 'draft'), ne(invoice.status, 'submitted')))
    .groupBy(invoice.status)

  const counts: Record<string, number> = {}
  let total = 0
  for (const row of rows) {
    counts[row.status] = row.count
    total += row.count
  }
  counts.all = total

  return counts
})

// ─── Get Contractor Profile (admin or accountant) ───────────────────

export const getContractorProfile = createServerFn({ method: 'GET' }).handler(
  async ({ data }: { data: { userId: string } }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as {
      id: string
      role?: string
      entityId?: string
    }
    if (actor.role !== 'admin' && actor.role !== 'accountant')
      throw new Error('Forbidden')

    const db = getDb()

    // Fetch contractor info
    const contractor = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        entityId: user.entityId,
        invoicePrefix: user.invoicePrefix,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, data.userId))
      .get()

    if (!contractor) throw new Error('User not found')

    // Fetch invoices based on role
    const isAccountant = actor.role === 'accountant'
    const conditions = [eq(invoice.userId, data.userId)]

    if (isAccountant) {
      // Accountants only see approved/paid invoices in their entity
      conditions.push(inArray(invoice.status, ['approved', 'paid']))
      if (actor.entityId) {
        conditions.push(eq(invoice.entityId, actor.entityId))
      }
    } else {
      conditions.push(ne(invoice.status, 'draft'))
    }

    const invoices = await db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        billTo: invoice.billTo,
        currencyCode: invoice.currencyCode,
        grandTotalCents: invoice.grandTotalCents,
        subtotalCents: invoice.subtotalCents,
        totalTaxCents: invoice.totalTaxCents,
        invoiceDate: invoice.invoiceDate,
        paymentDate: invoice.paymentDate,
        createdAt: invoice.createdAt,
      })
      .from(invoice)
      .where(and(...conditions))
      .orderBy(desc(invoice.createdAt))

    // Accountants can only view contractors who have invoices in their entity
    if (isAccountant && invoices.length === 0) {
      throw new Error('Forbidden')
    }

    return { contractor, invoices }
  },
)

// ─── List Invoices for Accountant (approved/paid, same entity) ──────

export const listAccountantInvoices = createServerFn({
  method: 'GET',
}).handler(async () => {
  const session = await getServerSession(getRequest())
  if (!session?.user) throw new Error('Unauthorized')

  const actor = session.user as {
    id: string
    role?: string
    entityId?: string
  }
  if (actor.role !== 'accountant') throw new Error('Forbidden')
  if (!actor.entityId) throw new Error('No entity assigned')

  const db = getDb()

  const results = await db
    .select({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      billTo: invoice.billTo,
      bankDetails: invoice.bankDetails,
      currencyCode: invoice.currencyCode,
      grandTotalCents: invoice.grandTotalCents,
      invoiceDate: invoice.invoiceDate,
      paymentDate: invoice.paymentDate,
      createdAt: invoice.createdAt,
      userId: invoice.userId,
      userName: user.name,
    })
    .from(invoice)
    .leftJoin(user, eq(invoice.userId, user.id))
    .where(
      and(
        eq(invoice.entityId, actor.entityId),
        inArray(invoice.status, ['approved', 'paid']),
      ),
    )
    .orderBy(desc(invoice.createdAt))

  return results
})

// ─── Mark Invoice Paid (approved → paid, accountant only) ───────────

export const markPaid = createServerFn({ method: 'POST' }).handler(
  async ({
    data,
  }: {
    data: { id: string; paymentMethod?: string; paymentReference?: string }
  }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as {
      id: string
      role?: string
      entityId?: string
    }
    if (actor.role !== 'accountant') throw new Error('Forbidden')

    const db = getDb()
    const result = await db.query.invoice.findFirst({
      where: eq(invoice.id, data.id),
    })

    if (!result) throw new Error('Invoice not found')
    if (result.entityId !== actor.entityId) throw new Error('Forbidden')
    if (result.status !== 'approved')
      throw new Error('Only approved invoices can be marked as paid')

    const now = new Date()

    await db
      .update(invoice)
      .set({
        status: 'paid',
        paymentDate: now,
        paymentMethod: data.paymentMethod || null,
        paymentReference: data.paymentReference || null,
        updatedAt: now,
      })
      .where(eq(invoice.id, data.id))

    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      action: 'paid',
      actorId: actor.id,
      entityType: 'invoice',
      entityId: data.id,
      details: { invoiceNumber: result.invoiceNumber },
      createdAt: now,
    })

    return { status: 'paid' as const }
  },
)

// ─── Get User Profile (for settings page) ────────────────────────────

export const getUserProfile = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const db = getDb()
    const userId = session.user.id

    const profile = await db.query.userProfile.findFirst({
      where: (up, { eq }) => eq(up.userId, userId),
    })

    return { profile: profile ?? null }
  },
)

// ─── Save User Profile (settings page) ──────────────────────────────

export const saveUserProfile = createServerFn({ method: 'POST' }).handler(
  async ({
    data,
  }: {
    data: {
      addressLine1?: string
      addressLine2?: string
      city?: string
      state?: string
      postalCode?: string
      country?: string
      bankName?: string
      bankAccount?: string
      bankRouting?: string
      bankSwift?: string
      bankIban?: string
      taxId?: string
      defaultTaxRate?: string
      currency?: string
    }
  }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const db = getDb()
    const userId = session.user.id
    const now = new Date()

    const existing = await db.query.userProfile.findFirst({
      where: (up, { eq }) => eq(up.userId, userId),
    })

    const profileData = {
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      bankName: data.bankName || null,
      bankAccount: data.bankAccount || null,
      bankRouting: data.bankRouting || null,
      bankSwift: data.bankSwift || null,
      bankIban: data.bankIban || null,
      taxId: data.taxId || null,
      taxSettings: data.defaultTaxRate
        ? JSON.stringify({ defaultRate: data.defaultTaxRate })
        : null,
      currency: data.currency || 'USD',
      updatedAt: now,
    }

    if (existing) {
      await db
        .update(userProfile)
        .set(profileData)
        .where(eq(userProfile.userId, userId))
    } else {
      await db.insert(userProfile).values({
        id: crypto.randomUUID(),
        userId,
        ...profileData,
        createdAt: now,
      })
    }

    return { ok: true }
  },
)

// ─── List All Users (admin) ──────────────────────────────────────────

export const listAllUsers = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()

    const results = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        entityId: user.entityId,
        invoicePrefix: user.invoicePrefix,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(asc(user.name))

    // Count invoices per user
    const invoiceCounts = await db
      .select({
        userId: invoice.userId,
        count: count(),
      })
      .from(invoice)
      .groupBy(invoice.userId)

    const countMap = new Map(invoiceCounts.map((r) => [r.userId, r.count]))

    return results.map((u) => ({
      ...u,
      invoiceCount: countMap.get(u.id) ?? 0,
    }))
  },
)

// ─── List Entities (admin) ───────────────────────────────────────────

export const listEntities = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()
    return db.select({ id: entity.id, name: entity.name }).from(entity)
  },
)

// ─── Invite / Create User (admin) ────────────────────────────────────

export const inviteUser = createServerFn({ method: 'POST' }).handler(
  async ({
    data,
  }: {
    data: {
      name: string
      email: string
      role: 'user' | 'admin' | 'accountant'
      entityId: string
      invoicePrefix?: string
    }
  }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    if (!data.name.trim() || !data.email.trim()) {
      throw new Error('Name and email are required')
    }

    const db = getDb()
    const now = new Date()

    // Check for duplicate email
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, data.email.trim().toLowerCase()))
      .get()

    if (existing) throw new Error('A user with this email already exists')

    const id = crypto.randomUUID()
    await db.insert(user).values({
      id,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      emailVerified: false,
      role: data.role,
      entityId: data.entityId || null,
      invoicePrefix: data.invoicePrefix?.trim() || null,
      createdAt: now,
      updatedAt: now,
    })

    return { id, name: data.name.trim() }
  },
)

// ─── Update User (admin) ────────────────────────────────────────────

export const updateUser = createServerFn({ method: 'POST' }).handler(
  async ({
    data,
  }: {
    data: {
      id: string
      role?: 'user' | 'admin' | 'accountant'
      entityId?: string
      invoicePrefix?: string
    }
  }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()
    const updates: Record<string, unknown> = { updatedAt: new Date() }

    if (data.role !== undefined) updates.role = data.role
    if (data.entityId !== undefined) updates.entityId = data.entityId || null
    if (data.invoicePrefix !== undefined)
      updates.invoicePrefix = data.invoicePrefix?.trim() || null

    await db.update(user).set(updates).where(eq(user.id, data.id))

    return { ok: true }
  },
)

// ─── Reporting Data (admin) ──────────────────────────────────────────

export const getReportingData = createServerFn({ method: 'GET' }).handler(
  async ({ data }: { data: { dateFrom?: string; dateTo?: string } }) => {
    const session = await getServerSession(getRequest())
    if (!session?.user) throw new Error('Unauthorized')

    const actor = session.user as { id: string; role?: string }
    if (actor.role !== 'admin') throw new Error('Forbidden')

    const db = getDb()

    const conditions = [inArray(invoice.status, ['approved', 'paid'])]
    if (data.dateFrom) {
      conditions.push(
        gte(invoice.invoiceDate, new Date(data.dateFrom + 'T00:00:00')),
      )
    }
    if (data.dateTo) {
      conditions.push(
        lte(invoice.invoiceDate, new Date(data.dateTo + 'T23:59:59')),
      )
    }

    // All matching invoices
    const rows = await db
      .select({
        id: invoice.id,
        category: invoice.category,
        currencyCode: invoice.currencyCode,
        grandTotalCents: invoice.grandTotalCents,
        invoiceDate: invoice.invoiceDate,
        status: invoice.status,
        entityId: invoice.entityId,
        userName: user.name,
      })
      .from(invoice)
      .leftJoin(user, eq(invoice.userId, user.id))
      .where(and(...conditions))
      .orderBy(asc(invoice.invoiceDate))

    // Entities for labeling
    const entities = await db
      .select({ id: entity.id, name: entity.name })
      .from(entity)

    return { invoices: rows, entities }
  },
)
