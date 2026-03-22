# Invoice Maker Spec

## Goal

Build an internal invoicing product that starts from a Wise-inspired invoice generator and grows into a simple invoice workflow system for the company.

The product should let team members create professional invoices, save them in the system, and route them through a lightweight review and payment process.

## Scope

- Start from the referenced invoice generator as the baseline.
- Keep the product plain, clean, and professional.
- Do not do a direct 1:1 copy of the reference design.
- Leave room to build more accounting workflow features on top later.

## Core Requirements

### Invoice Creation

- Invoice form and PDF output. Visually close in quality to the Wise reference: clean, simple, professional.
- No forced payment terms (e.g., "30 days") — optional field.
- Inline guidance where useful (tooltips, short instructions for unclear fields).

### Accounts and Storage

- Users must be able to log in.
- Login should use company Google accounts.
- Users must be able to create and store invoices in the system.

### Workflow

- A user creates an invoice and saves it in the tool.
- Admin can access submitted invoices, download them, and mark them as paid.
- The tool should support broader company use, not just a single recurring invoice use case.
- The long-term direction should support invoice tracking and related accounting workflows.

### Invoice Identity

- Invoice numbers should be auto-generated.
- The system should avoid duplicate invoice numbers.

### Entities and Access

- The product must support two entities in one system.
- Working names can be `SV` and `LP`.
- The split between entities must stay clean.
- A combined admin view is acceptable if entity separation remains clear.
- Accountant access should be separated by entity.

### Reporting

- Include a simple KPI dashboard.
- Show spend by category, with examples including support, development, and marketing.
- Support reporting over month-by-month views and custom date ranges, including longer windows such as 6 months and 12 months.
- Keep reporting lightweight.

### Security

- Security is a major requirement.
- The system should be designed for sensitive financial documents and should minimize leak risk.

## Product Expectations

- Plain branding for now.
- High polish.
- Clean and professional feel.
- Some creative freedom is acceptable as long as the result stays simple and original.

## Current Product Direction

The current generator should be treated as the starting point, not the final product boundary. The intended direction is an internal invoice tool with authentication, saved invoices, entity-aware access, admin handling, accountant access, and lightweight reporting.

## Invoice Templates

- Each user has a single default template derived from their profile (entity, category, bank details, tax settings).
- "Duplicate last invoice" button for repeat use — clones the previous invoice for editing.
- No multiple template management. No template CRUD UI.

## Tax

- Users configure their own tax details on their profile (tax name, rate, tax ID).
- Tax details auto-apply when the user creates an invoice.
- Current scope is a single tax field per invoice (`taxPercent`).
- Subtotal → tax → grand total display.
- Multi-tax lines and a tax-inclusive vs tax-exclusive toggle are deferred until a later iteration.
- No admin-configured tax rules. No per-jurisdiction auto-detection.

## Security

- Rely on hosting provider encryption at rest (Cloudflare D1/Workers default).
- SSL everywhere.
- Role-based access control: users, admins, and accountants can only access data their role and entity assignment permits.
- No application-level field encryption.
- Bank details and financial data are not exposed in API responses to unauthorized roles.
- Audit log of state-changing actions only: created, edited, submitted, approved, rejected, paid — with timestamp and actor. No view tracking.

## Accountant Workflow

- Accountants see submitted/approved invoices for their assigned entity.
- They mark invoices as paid, recording payment date, method, and reference.
- No bank transaction import or matching interface — accountants handle bank-side reconciliation in their own accounting software.

## Multi-Currency

- Invoices may be created in any currency from a curated list.
- The system stores the currency code and symbol. No conversion or exchange rate infrastructure.
- Reports show amounts grouped by currency (e.g., "$12,000 USD + 45,000 AED this month"), not converted to a single base currency.
- Accountants handle any cross-currency reconciliation externally.

## Entities

- Two entities: `SV` and `LP`, each with their own bank details, addresses, tax IDs, and logos.
- Users are assigned to exactly one entity by admin. They never see the other entity's data.
- Admins see both entities with clear separation in the UI.
- Accountants are assigned to one entity each and see only that entity's data.
- Invoices are always contractor → entity. No cross-entity invoicing.

## Invoice Numbering

- Each user has an independent auto-incrementing invoice sequence.
- Admin sets a prefix/code for each user when inviting them (e.g., "JD", "SA").
- System generates sequential numbers: JD-001, JD-002, etc.
- Admin can change the prefix later.
- System-controlled. No manual override of the sequence number.

## Phasing

- Ship everything in one release: auth, invoice CRUD, workflow, admin, accountant access, reporting.
- No phased rollout.

## Tech Stack

- **Runtime:** TanStack Start on Cloudflare Workers.
- **Frontend:** React app bundled by Vite with SSR-aware routing/layout support.
- **Routing:** TanStack Router file routes via TanStack Start.
- **UI:** Tailwind CSS + shadcn/ui (existing).
- **Auth:** better-auth with Google OAuth (existing).
- **Database:** Cloudflare D1 (SQLite).
- **PDF:** Client-side generation.
