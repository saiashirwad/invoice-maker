# Implementation TODOs

## ❌ Missing Features

- [ ] **CSV/Excel export** — admin needs to export pending invoices for accountants (chat: "export all pending invoices button")
- [ ] **Entity configuration UI** — no admin page to set entity bank details, addresses, tax IDs, logos (`entity` table has fields but no `/admin/entities` route). Spec: "Each with their own bank details, addresses, tax IDs, and logos"
- [ ] **Real PDF generation** — currently uses `window.print()`, no programmatic PDF library (jsPDF, html2pdf, etc.). Quality depends on user's browser print settings. Spec: "PDF output. Visually close in quality to the Wise reference"

## ⚠️ Partially Implemented

- [ ] **Accountant mark paid — payment date input** — no date field, always stamps `now()`. Spec: "recording payment date, method, and reference"
- [ ] **Settings tax name field** — missing Tax Name input (e.g., "VAT", "GST"). Spec requires "tax name, rate, tax ID" but only rate + ID are configurable
- [ ] **Reporting custom date range picker** — has presets (1m, 3m, 6m, 12m) but no arbitrary custom range. Chat says "custom dates" explicitly
- [ ] **Invoice category on PDF** — category is assigned to invoices but not displayed in `InvoicePreview`

## 🟡 Schema & Data Issues

- [ ] **`user.entityId` nullable** — spec says "assigned to exactly one entity", needs `.notNull()`
- [ ] **`invoice.category` is plain text, no FK** — `category` table exists but invoice doesn't reference it; typos/renames break integrity
- [ ] **No `taxName` snapshot on invoice** — if user changes their tax name later, historical invoices lose context
- [ ] **Currency list missing AED** — spec uses "45,000 AED this month" as example but AED isn't in curated list

## 🟢 Security Gaps

- [ ] **No audit log for user management** — invite, role/entity changes untracked (Medium)
- [ ] **No audit log for profile/bank detail changes** — `saveUserProfile` untracked (Medium)
- [ ] **No audit log for category CRUD** — create/delete/rename untracked (Low)
- [ ] **No guard against demoting the last admin** — possible self-lockout (Low)
- [ ] **New OAuth users land unassigned** — `role=user, entityId=null`, must be pre-invited by admin (Low)

## 📋 UX Polish

- [ ] **More tooltips** — only 4 fields have them; spec wants "inline guidance where useful"
- [ ] **Multi-currency totals mixed in user dashboard** — sums USD + AED together as one number
- [ ] **Global audit log page** — timeline exists per-invoice but no admin overview
- [ ] **Entity logo upload UI** — entity has `logoKey` but no upload flow
- [ ] **Delete invoice action** — drafts can't be deleted
