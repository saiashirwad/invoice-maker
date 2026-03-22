# Admin Redesign Audit

Audit date: March 22, 2026

Method:

- Walked the live admin routes with `agent-browser` at `http://localhost:3000/admin`
- Cross-checked the rendered UI against the route implementations in `src/routes/admin/*` and the shared shell in `src/components/AdminLayout.tsx`
- Applied the `interface-craft` design-critique lens: context, first impression, visual design, interface design, consistency, and user state

Routes reviewed:

- `/admin`
- `/admin/processed`
- `/admin/categories`
- `/admin/users`
- `/admin/reporting`

Artifacts:

- Full-page screenshots captured to `/tmp/invoice-admin-audit`

## Product Context

This is an internal finance workflow for admins reviewing invoices, managing contractors, maintaining categories, and checking spend. The emotional context is operational and high-trust. Admins are not browsing for inspiration. They are making approval decisions, scanning for risk, and trying to keep the queue moving without mistakes.

The right design bar is not "pretty SaaS dashboard." It is "calm finance operations tool." The interface should feel clear, controlled, fast, and trustworthy.

## First Impressions

The current admin is usable, but it feels like a developer-first utility surface that never got a product-quality pass. The shell is thin and generic, the pages lean heavily on text rows, and there is very little hierarchy telling the admin where to start. Controls, filters, totals, and content are all rendered with roughly the same visual weight, so the product feels flatter and busier than it should. On top of that, dev-only chrome is leaking into the actual app surface, which immediately lowers the perceived quality of the tool.

## Global Findings

### Structural issues

**Dev chrome inside the product UI** — Every admin route currently exposes the dev role switcher and TanStack devtools panels from [`src/routes/__root.tsx`](/Users/texoport/work/invoice-maker/src/routes/__root.tsx) and [`src/components/DevRoleSwitcher.tsx`](/Users/texoport/work/invoice-maker/src/components/DevRoleSwitcher.tsx). This breaks focus, pollutes the operator surface, and makes the app feel unfinished. These controls should never visually compete with invoice review actions.

**Weak page framing** — The shared shell in [`src/components/AdminLayout.tsx`](/Users/texoport/work/invoice-maker/src/components/AdminLayout.tsx) is only a thin rail plus content slab. It gives navigation, but not orientation. There is no persistent page context area, no "what matters on this screen" region, and no place for cross-page signals like pending risk, entity split, or recent activity.

**List-first, workflow-second layouts** — Most pages present raw lists immediately, with minimal framing. The result is that the UI shows data before it shows intent. Admins see rows, not workflows.

**Entity separation is too subtle** — The spec requires clean separation between SV and LP. Right now entity labels exist, but they read like metadata chips instead of a core organizational axis. That is too weak for finance operations.

**Details are hidden in dialogs instead of supported in layout** — Review and processed both depend on secondary dialogs for the full story. That makes the core screens feel compressed and forces extra clicks for context.

### Visual issues

**No strong visual hierarchy** — Most pages use the same narrow grayscale palette, similar text sizes, and similar border treatments. That keeps the interface quiet, but it also makes everything feel equally important. A finance tool should be calm, not flat.

**Too much dependence on tiny uppercase labels and muted captions** — The current system overuses small text to create hierarchy. It does the opposite: it makes everything feel secondary.

**Density without rhythm** — Rows are compact, but there is little change in scale between headers, summaries, controls, and records. The interface is text-dense without feeling information-dense.

**Action affordances are understated in the wrong places** — Primary actions like approve, edit, and add often use the same tone as passive metadata. Hover-only controls on important objects are especially weak.

### Interaction issues

**No clear focusing mechanism** — On every route, the admin has to decide what to look at first. The design does not establish a deliberate entry point.

**Low reward for completed work** — The system processes invoices, but the interface does not create enough momentum. Completed states feel merely removed, not resolved.

**Filters are functional but not legible** — The processed page has capable filter controls, but they are presented as a flat row of pills without a clear sense of which filters matter now, how much data is affected, or what view the admin is in.

## Redesign Direction

### Design goals

- Make the admin feel like a focused operations console, not a generic CRUD panel
- Use entity, status, and workflow stage as first-class layout signals
- Give each page a clear focal zone before showing supporting detail
- Improve scan speed for invoice-heavy screens
- Keep the tone plain, professional, and calm

### Visual system

- Background: warm neutral canvas, not pure white
- Surfaces: layered panels with clear elevation differences between shell, summaries, and work areas
- Accent: one primary green for affirmative workflow, one restrained amber for caution, one restrained red for rejection/error
- Entity colors: keep SV and LP distinct but muted, used consistently in chips, side accents, and grouped sections
- Typography: use a more intentional pair such as `Instrument Sans` for UI copy and `IBM Plex Mono` for invoice IDs, currency values, and compact operational metadata
- Shape: increase radii slightly for cards and drawers, keep tables and dense list items tighter
- Shadows: tight and directional, not soft gray fog

### Shell redesign

Replace the current shell with a stronger admin frame:

- Left rail: wider, quieter, with grouped navigation and space for entity legend
- Top bar: page title, page description, relevant quick action, and contextual summary
- Utility zone: right side of top bar for date context, last sync, or global filters later
- Content canvas: 12-column layout that can support split panes, summaries, and wide ledger views

The shell should feel closer to Stripe Dashboard or Linear admin tools than to generic shadcn examples, but with a more understated finance tone.

### Motion principles

- Use short panel and drawer transitions, around 180-220ms
- Slide detail panes horizontally rather than relying on modal interruption
- Animate counts and section refreshes softly after actions like approve/reject
- Use staged reveal only for summaries and empty states, not for dense lists

## Page-by-Page Critique And Redesign

## Review

Current source:

- [`src/routes/admin/index.tsx`](/Users/texoport/work/invoice-maker/src/routes/admin/index.tsx)

### Context

This is the highest-stakes admin page. It is the queue where submitted invoices are accepted or rejected. The user is trying to move quickly without approving the wrong thing.

### First impression

The page feels like a narrow inbox made from generic rows. It does not feel like a deliberate review workspace. The amount total is helpful, but it is visually too close to the list itself, and the inline Approve buttons compete with row navigation in a way that feels brittle.

### What is not working

**No review workspace** — The screen is basically a list with buttons. There is no persistent side-by-side comparison, no strong summary layer, and no visible distinction between "scan the queue" and "inspect the invoice."

**Action and navigation are jammed into the same row** — Each row is clickable, but it also contains a checkbox and an approve button. That is efficient in code, but visually and behaviorally it is noisy. The row is trying to be list item, selection control, and primary action zone at the same time.

**Entity and anomaly signals are too soft** — "Matches last," "Last $X," and entity chips are useful, but they are treated like small captions. Those are the exact kinds of signals that should drive the reviewer’s attention.

**The summary is too thin** — The current page mostly shows `Pending (2)` and a total amount. That is not enough orientation. Reviewers need queue health at a glance.

**The dialog is doing too much rescue work** — The detail dialog carries the contextual understanding that the list should already establish. That means the default state of the page is under-informative.

### Redesign

Turn this into a triage workspace with three layers:

- Header strip:
  - `Review Queue`
  - `2 invoices waiting`
  - total pending by currency
  - split by entity
  - quick indicators for "first invoice", "amount changed", and "has tax"
- Main split layout:
  - left pane: grouped queue
  - right pane: sticky detail inspector
- Footer action bar:
  - appears when rows are multi-selected
  - batch approve, batch reject, clear selection

Queue design:

- Group invoices by entity first, then by recency
- Each row should have four columns:
  - contractor and invoice ID
  - invoice metadata
  - risk/anomaly signal
  - amount and primary action
- The anomaly column should visually surface:
  - first invoice
  - amount changed from previous
  - rejected previously
  - unusually high tax or missing category later if applicable

Detail inspector:

- Replace the modal-first flow with a persistent right drawer on desktop
- Show invoice summary, comparison to previous paid invoice, rejection history, tax summary, and quick links to full invoice
- Keep approve and reject actions pinned at the bottom of the inspector

Tone and layout:

- Use a stronger summary band at the top with compact KPI tiles
- Keep the queue dense, but introduce clearer row states: default, hovered, selected, anomaly, approved-animation-out
- Entity color should appear as a slim left-edge accent or section header, not just a tiny badge

## Processed

Current source:

- [`src/routes/admin/processed.tsx`](/Users/texoport/work/invoice-maker/src/routes/admin/processed.tsx)

### Context

This is the ledger and audit trail. Admins come here to answer questions, filter history, verify status, and inspect patterns across time and people.

### First impression

The page is functionally rich and visually underpowered. It has useful filters, but the screen still reads like one long wall of rows. The summary line `25+ invoices` plus a single amount is too weak for the amount of information on the page.

### What is not working

**Forty-plus buttons without hierarchy** — The live DOM exposes 41 buttons on this screen. That is a clear sign that the interaction surface is too flat. Everything is "available," but not enough is "organized."

**The history view is a list, not a ledger** — Processed invoices are rendered as stacked clickable rows. That is fine for small history, but the route already supports filtering and sorting like a ledger. The UI should acknowledge that and become a proper reviewable table.

**Filters do not establish a mode** — Filter pills are compact, but they do not communicate the current view strongly enough. There is no sense of a saved view, a primary breakdown, or how the filters are reshaping the dataset.

**Totals are misleading when multiple currencies are present** — The current summary derives `primaryCurrency` from the first visible row. That is not a trustworthy summary pattern for a multi-currency product.

**Load more is too quiet** — Infinite history is being managed with a small "Load more" affordance, which makes the dataset feel less deliberate than it is.

### Redesign

Rebuild this page as an invoice ledger:

- Header:
  - `Processed Invoices`
  - subtitle with visible result count and active date window
  - quick actions: export CSV later, clear filters, saved views later
- Summary rail:
  - counts by status
  - totals by currency
  - entity split
- Filter toolbar:
  - status segmented control
  - contractor combobox
  - category combobox
  - date range
  - sort
  - all rendered in one cohesive toolbar container

Main content:

- Replace the row stack with a dense table or ledger grid
- Recommended columns:
  - invoice ID
  - contractor
  - entity
  - category
  - invoice date
  - status
  - amount
- Allow click to open a right-side detail drawer instead of a modal
- Keep the table header sticky
- Use status color sparingly and consistently
- Use monospace for invoice IDs and amounts

Filter behavior:

- Show active filters as readable chips underneath the toolbar
- Add a visible result sentence such as:
  - `29 invoices across 3 currencies, last 30 days`
- When filtered by contractor, preserve the table shape instead of mutating semantics too much

Multi-currency handling:

- Never compress mixed currencies into one fake total
- Show grouped totals by currency in the summary layer
- If a user asks for one number, provide per-currency tiles, not conversion

## Categories

Current source:

- [`src/routes/admin/categories.tsx`](/Users/texoport/work/invoice-maker/src/routes/admin/categories.tsx)

### Context

This page is lightweight taxonomy management. It should feel low-stress, but still intentional, because category hygiene affects reporting quality.

### First impression

The page feels sparse and slightly improvised. The inline add form is efficient, but the overall screen does not communicate why categories matter or how they relate to invoice behavior.

### What is not working

**The page is too minimal for its job** — Categories are shown as simple rows with invoice counts. That is usable, but it does not make the taxonomy feel real or important.

**Important actions hide on hover** — Rename and delete only appear on hover. For a low-density admin page, that restraint is unnecessary and makes the controls feel less trustworthy.

**The volume bars are ambiguous** — The background-width bar gives some sense of usage, but it is too subtle to function as actual information visualization and too decorative to feel structural.

**Creation is transient instead of deliberate** — The inline add state feels like a quick hack, not a management workflow. This matters because naming decisions affect reporting and downstream organization.

### Redesign

Turn this into a taxonomy manager:

- Header:
  - `Categories`
  - short explanation that categories shape reporting and contractor defaults
  - primary action `New Category`
- Summary row:
  - total categories
  - categories currently in use
  - uncategorized invoice count
- Main content:
  - a structured list or card-table hybrid
  - columns: category name, usage count, share of total, last used, actions

Recommended layout:

- Left side: category list
- Right side: category inspector or edit panel

For each category, show:

- name
- invoice count
- percentage of total invoices
- small sparkline or usage bar only if it is readable
- state chip for `unused` when count is zero

Interaction changes:

- Use a side sheet or inline panel for create and rename
- Keep delete available, but visually separate it into a destructive zone
- Provide bulk reassurance for editing:
  - `Renaming changes reporting labels going forward`

This page does not need to be flashy. It needs more structure, more clarity, and stronger cause-and-effect between category maintenance and reporting quality.

## Users

Current source:

- [`src/routes/admin/users.tsx`](/Users/texoport/work/invoice-maker/src/routes/admin/users.tsx)

### Context

This is people and access management. Admins are checking who can log in, what role they have, which entity they belong to, and how active each contractor is.

### First impression

This screen is closer to useful than the others, but it still feels like a compact list rather than a management surface. Search and role filters are good additions, yet the page still hides too much structure inside row metadata.

### What is not working

**People records are flattened into metadata strings** — Name, role, entity, and prefix are all pushed into one compact row. That is efficient for small lists, but it weakens identity and access clarity.

**Mixed mental models in one list** — Contractors navigate to contractor details, while admins and accountants open edit dialogs. That difference is logical, but the visual pattern does not explain it.

**Role segmentation is present but not strong enough** — The segmented filter works, yet the page still reads as one undifferentiated roster.

**Activity is too hidden** — Contractor invoice counts exist, but they are tucked into a small fixed-width column. For a contractor management tool, that is useful primary information.

### Redesign

Make this a team directory with access clarity:

- Header:
  - `Team & Access`
  - summary by role and entity
  - primary action `Invite User`
- Summary cards:
  - contractors
  - admins
  - accountants
  - unassigned or missing entity if any
- Search and filters:
  - keep search
  - turn role filter into a more deliberate segmented control
  - add entity filter

Main layout options:

- Preferred: management table
  - name
  - role
  - entity
  - invoice prefix
  - invoice count
  - status or last activity later
  - actions
- Alternative: grouped roster sections by role with richer cards

The management table is the better fit here because the task is administrative, not social.

Interaction changes:

- Open add/edit in a right-side sheet, not a centered modal
- Treat contractors, admins, and accountants consistently in the visual system, even if click behavior differs
- Surface invoice volume and entity assignment as first-class columns
- Use clearer empty and filtered states

Visual language:

- Larger, cleaner avatar treatment
- Role chips with restrained color
- Prefix and invoice counts in monospace or compact metric cells
- Row hover should indicate destination clearly

## Reporting

Current source:

- [`src/routes/admin/reporting.tsx`](/Users/texoport/work/invoice-maker/src/routes/admin/reporting.tsx)

### Context

This is the lightweight KPI view. It should help leadership or admins understand spend patterns without pretending to be a full BI tool.

### First impression

This is the most visually designed admin page today, but it still feels like a collection of bars and boxes rather than a coherent dashboard. The top cards are a start, yet the page is still too list-like and does not handle multi-currency storytelling elegantly enough.

### What is not working

**The date-range control is undersold** — The only visible page control is a plain select. That makes the whole dashboard feel lighter-weight than the underlying data deserves.

**The dashboard tries to summarize multiple currencies in one hero** — The `Total Volume` card is readable, but the relationship between the primary amount and secondary currencies is still mentally expensive.

**Charts are really ranked lists** — Spend by category and monthly trend are both bar rows. They work, but they do not differentiate comparison types strongly enough.

**There is no clear story arc** — A good reporting page answers questions in sequence: what happened, where it happened, why it changed. The current page mostly enumerates metrics.

### Redesign

Reframe this as a lightweight financial overview:

- Header:
  - `Reporting`
  - selectable range as a segmented control, not a plain dropdown
  - optional compare toggle later
- Row 1:
  - total invoice volume by currency
  - paid vs outstanding by currency
  - invoice count and entity split
- Row 2:
  - spend by entity
  - spend by category
- Row 3:
  - monthly trend shown as small multiples or grouped series by currency

Key principle:

- Separate currencies visually instead of nesting them as subordinate text whenever possible

Recommended charting approach:

- Category: horizontal bars are fine, but improve label hierarchy and percentage context
- Trend: use compact line or column charts per currency, not one mixed bar list
- Entity split: paired cards or a two-column comparison module

Dashboard tone:

- Keep the hero section strong but not dark and decorative
- Use clean, editorial spacing
- Let the most important number on each card breathe
- Reduce border noise

## Recommended Design System Components

Build or refactor toward a shared admin component set:

- `AdminShell`
- `AdminPageHeader`
- `AdminSummaryCard`
- `AdminToolbar`
- `EntityChip`
- `StatusChip`
- `MetricCell`
- `LedgerTable`
- `InspectorDrawer`
- `FilterChip`
- `SectionHeading`

These components should replace one-off styling decisions spread across the current routes.

## Implementation Order

1. Remove dev-only chrome from the visible app surface in development and production contexts.
2. Redesign the shared shell in [`src/components/AdminLayout.tsx`](/Users/texoport/work/invoice-maker/src/components/AdminLayout.tsx).
3. Rebuild the review route as a split-pane triage workspace.
4. Rebuild processed as a true ledger view with grouped currency summaries.
5. Rebuild users as an access-management table plus right-side forms.
6. Rebuild categories as a structured taxonomy manager.
7. Rebuild reporting with clearer currency separation and stronger chart/story hierarchy.

## Success Criteria

The redesign is successful if:

- an admin can tell what needs attention within three seconds on every route
- SV and LP separation is obvious without reading fine print
- processed history feels like a trustworthy ledger, not a long list
- user management feels like access control, not a contact list
- reporting communicates trend and composition without fake currency aggregation
- the interface feels productized, not like an internal dev tool with production data
