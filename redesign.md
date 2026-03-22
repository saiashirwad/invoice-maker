# Admin Redesign TODO

Companion design spec: `design.md`

This file turns the admin audit into an implementation checklist. The goal is not a visual refresh. The goal is to rebuild the admin into a calm finance operations tool with clearer workflow, stronger hierarchy, and better entity separation.

Notes for this checklist:

- Use critique context to guide design decisions, not as a requirement to add explanatory UI copy.
- Optimize for calm authority and decision confidence in a high-trust financial workflow.
- Benchmark against operational tools like Stripe Dashboard, Linear, and Mercury for clarity, density, and consistency.

## Working Rules

- Keep SV and LP separation obvious at the layout level, not just as small metadata chips.
- Do not aggregate mixed currencies into one fake total.
- Prefer persistent inspectors and side sheets over modal-first detail flows.
- Optimize for scan speed on dense admin screens.
- Keep the visual language monochrome for the vast majority of the UI.
- Do not introduce color unless it is genuinely necessary to prevent a meaningful state or risk from being missed.
- Preserve the underlying workflow semantics while improving framing and interaction clarity.

## P0 Foundation

### Shared Shell

- [x] Replace the current thin admin frame with a stronger shell.
      Target: `src/components/AdminLayout.tsx`
- [x] ~~Add a compact route context band with route label, operational counts, active state, and room for primary controls.~~ **Removed — no top context band on any admin route. Route context lives in the page content, not a shell-level band.**
- [x] Widen and quiet the left rail so navigation, page grouping, and entity legend have deliberate space.
- [x] Establish a consistent content canvas that can support split panes, wide ledgers, and summary rows.
- [x] ~~Add a right-side utility zone in the context band for date context, sync state, or future global filters.~~ **Removed with context band.**

### Shared Design System

- [x] Standardize shared admin primitives and ownership:
  - Source of truth is this section plus `design.md`.
  - Define all components in/under `src/components/admin/` and reuse them via route files, do not create one-off replacements in routes.
- [x] Create or refactor the following primitives and their responsibilities:
  - `AdminShell` (layout shell): 240px rail, contextual breadcrumbs, page max width controls, route-level sticky context band, right utility cluster.
  - ~~`AdminContextBand` (top working header)~~: **Removed. No top context band anywhere. Route-level context (counts, labels, actions) should live inside the page content itself, not a shell-level band.**
  - `AdminSummaryCard` (metric surface): consistent padding (`space-6`), non-inverted tonal treatment, title + primary/secondary value lines, optional trend/caveat footer.
  - `AdminToolbar` (control row): search + primary filters + segmented controls + actions in one 52px band, no fragmented UI islands.
  - `SectionHeading` (section title group): left title, optional helper line, optional action and secondary action.
  - `EntityChip` (SV/LP semantic): outlined by default, semantic text/outline only, no status semantics.
  - `StatusChip` (lifecycle status): dot + label with semantic background/text tokens from `design.md`.
  - `MetricCell` (financial cell): monospace, right-aligned amounts, tabular numerals, explicit currency label.
  - `LedgerTable` (ledger shell): sticky header, fixed column alignments, row action column not visually dominant by default.
  - `InspectorDrawer` (persistent detail surface): right-side drawer pattern for review/management context.
  - `FilterChip` (active filter token): text + remove action, subtle active style, can be grouped in filter bar.
- [x] Typography and numeric treatment:
  - Use `JetBrains Mono` for invoice IDs, prefixes, invoice amounts, and row IDs.
  - Apply `font-variant-numeric: tabular-nums` in all monetary/date-dense cells.
  - Keep dates and names in proportional font (`Inter`) for quick parsing.
- [x] Standardize color and meaning tokens:
  - Default to grayscale and monochrome treatment across shared admin surfaces.
  - Entity chips use restrained neutral treatment from `design.md`, not decorative accent color.
  - Status is only represented through `StatusChip`, never plain icon-only status text.
  - Caution states should first rely on copy, iconography, and tonal contrast; use color only in the rare cases where neutral treatment is not clear enough.
- [x] Badge/tag vocabulary and consistent use:
  - Use pills for entity, role, category, and counts.
  - Use dot+label status chips only for lifecycle states.
  - Use outlined chips for medium-importance metadata.
  - Use plain text when semantic context is inherited from surrounding rows (avoid competing status encoding).
  - Never mix pill/dot/plain text for the same semantic class across routes.
- [x] Row state matrix for list and table surfaces:
  - Default: neutral surface, muted border
  - Hover: `interactive-hover-bg`
  - Selected: `interactive-active-bg` + active marker
  - Focus: `interactive-focus-ring`
  - Caution: warning background/text pair, no icon-only warning
  - Completed: de-emphasized text and icon tone, no status ambiguity
- [x] Contrast and surfaces:
  - Keep cards/drawers on light surfaces (`bg-surface`/`bg-surface-sunken`) with restrained borders.
  - Do not introduce near-black/near-white inversion except in dedicated contrast modules used across a full route.
  - If emphasis is needed, use spacing, type weight, and grayscale contrast before any color.
  - Treat saturated color as an exception path, not a standard emphasis tool.
- [x] Action hierarchy:
  - One filled/primary control per working region.
  - Secondary actions are outlined; tertiary actions are ghost/text.
  - Destructive actions are red (`button-danger-bg`) and visually separated from routine controls.
  - Never use equal visual weight for primary and destructive actions.
- [x] Filter system standardization:
  - One toolbar pattern for all admin list pages with dropdowns/chips/segments.
  - Active filters render as chips, grouped below the toolbar.
  - `Clear all` is visible from route context when >=2 filters are active.
  - Filter state is URL-serializable and route-shareable.
- [x] Destructive action tiers:
  - Low risk: single action + optional undo.
  - Medium risk: explicit confirmation with consequence text.
  - High risk: explicit confirmation + hard-to-miss state transition (e.g., locked, canceled, or resolved banner).
- [x] Detail-flow rule:
  - Any review/management flow that should keep list context open uses `InspectorDrawer` (right-side).
  - Centered modals are reserved for confirmations and short low-context forms only.

## P1 Review Queue

Target route: `src/routes/admin/index.tsx`

### Layout
- [ ] Add a summary band above the queue with:
  - pending invoice count
  - totals by currency
  - entity split
  - quick anomaly counts if available
- [ ] Make low-count states still feel intentional.
      Avoid the current large white void when only a few invoices are pending by using a denser split layout and secondary operational context.
- [ ] Keep the queue on the left and a sticky invoice inspector on the right for desktop.
- [ ] Define a responsive mobile behavior that keeps context without falling back to a modal-heavy flow.

### Queue

- [ ] Group invoices by entity first, then by recency.
- [ ] Redesign each queue row around four clear zones:
  - contractor plus invoice ID
  - invoice metadata
  - anomaly or review signal
  - amount plus primary action
- [ ] Separate row navigation from row actions so approve, reject, and selection are not fighting the click target.
- [ ] Make anomaly signals first-class visual elements:
  - first invoice
  - invoice aging
  - amount changed from last invoice
  - rejection history
  - tax or category concerns when present
- [ ] Increase row hierarchy so contractor, amount, and status outrank secondary metadata.
- [ ] Hide the bulk action control when zero items are selected instead of showing `Approve 0`.
- [ ] Add multi-select with a persistent batch action bar.
- [ ] Add keyboard-driven queue handling for power users.
      Support row navigation, open detail, toggle selection, approve, and reject without forcing mouse-only review.

### Inspector

- [ ] Replace the current dialog-first detail view with a persistent inspector.
- [ ] Show invoice summary, line items, previous invoice comparison, rejection history, tax summary, and full invoice link in one place.
- [ ] Include enough contractor and invoice history to support approval without forcing a second context switch.
- [ ] Pin approve and reject actions at the bottom of the inspector.
- [ ] Auto-advance the queue after approve or reject when appropriate so repeated review work keeps momentum.
- [ ] Add a resolved transition so approved or rejected items feel completed, not just removed.

### Done When

- [ ] An admin can open `/admin` and identify the next invoice to review within three seconds.
- [ ] Entity and anomaly signals are visible without opening a detail view.
- [ ] The route no longer depends on a centered modal for core review context.

## P2 Processed Ledger

Target route: `src/routes/admin/processed.tsx`

### Layout

- [x] Rebuild the page as a ledger instead of a long stack of clickable rows.
- [x] Add a stronger top control band with result count, active date window, and room for later export or saved views.
- [x] Add a summary rail for counts by status, totals by currency, and entity split.

- [x] Consolidate status, contractor, category, date range, and sort into one cohesive toolbar.
- [x] Show active filters as readable chips below the toolbar.
- [x] Add a clear result sentence describing the current dataset.
- [x] Make the filter state feel like a mode, not a loose row of pills.
- [x] Keep filter state bookmarkable and shareable through URL params.
- [x] Persist last-used filters where it improves repeat admin workflows without obscuring the current state.
- [x] Replace the current `Load more` ambiguity with visible dataset scope.
      Keep result count visible near the working area and show progress like `showing 26 of 29` when pagination remains.

### Ledger Table

- [x] Replace the stacked rows with a dense table or ledger grid.
- [x] Include columns for:
  - invoice ID
  - contractor
  - entity
  - category
  - invoice date
  - status
  - amount
- [x] Keep the table header sticky.
- [x] Open row details in a right-side drawer instead of a modal.
- [x] Use restrained status color and monospace metric cells.
- [x] Keep the processed ledger visually monochrome unless a rare compliance or risk cue truly requires color.

### Currency Handling

- [x] Remove any single-summary pattern that derives currency from the first visible row.
- [x] Show grouped totals by currency in the summary layer.
- [x] Preserve per-currency reporting when filters return mixed-currency data.

### Done When

- [x] The route reads like a trustworthy ledger rather than a long inbox.
- [x] Filter state is legible at a glance.
- [x] No mixed-currency result set is summarized as one misleading total.

## P3 Team And Access

Target route: `src/routes/admin/users.tsx`

### Layout

- [x] Reframe the page as access management, not a compact contact list.
- [x] Add a stronger top control band with role and entity summaries plus a primary `Invite User` action.
- [x] Add summary cards for contractors, admins, accountants, and any missing assignments.

### Filters And Table

- [x] Keep search, but redesign role filtering as a clearer segmented control.
- [x] Add an entity filter.
- [x] Replace flattened rows with a management table that includes:
  - name
  - role
  - entity
  - invoice prefix
  - invoice count
  - status or activity field when available
  - actions
- [ ] Surface invoice volume and entity assignment as first-class cells.

### Interaction

- [x] Move add and edit flows into a right-side sheet.
- [x] Make row hover and row click behavior obvious, especially where contractors and admins differ today.
- [x] Standardize visual treatment for contractors, admins, and accountants even if their destination flows differ.
- [x] Add cleaner empty and filtered states.

### Done When

- [ ] A user’s role and entity are readable without parsing a metadata string.
- [ ] Contractor activity is visible as primary information.
- [ ] The page feels like access control, not roster browsing.

## P4 Categories

Target route: `src/routes/admin/categories.tsx`

### Layout

- [ ] Rebuild the page as a lightweight taxonomy manager.
- [ ] Add a compact control band with in-use counts, defaults context, and create controls.
- [ ] Add summary metrics for:
  - total categories
  - categories in use
  - uncategorized invoices if available

### List And Inspector

- [ ] Replace the sparse row list with a structured list or card-table hybrid.
- [ ] Include columns for:
  - category name
  - usage count
  - share of total
  - last used
  - actions
- [ ] Add an inspector or side panel for create and rename workflows.
- [ ] Keep delete available but visually isolated as a destructive action.

### Interaction

- [ ] Remove hover-only dependence for rename and delete on a low-density page.
- [ ] Keep edit and delete affordances visible on narrow viewports where hover is unreliable.
- [ ] Make category creation feel deliberate rather than transient.
- [ ] If usage bars remain, make them genuinely readable rather than decorative.
- [ ] Put value labels close to category bars so counts and amounts do not require long-distance scanning.
- [ ] Require confirmation for destructive deletes when a category has associated invoices.
      The confirmation should explain the consequence, including how many invoices will become uncategorized.
- [ ] Add undo support for low-risk deletes where immediate reversal is safe.
- [ ] Add explicit reassurance copy when renaming affects future reporting labels.

### Done When

- [ ] Category maintenance feels structured and trustworthy.
- [ ] Actions are visible without hunting for hover states.
- [ ] The relationship between categories and reporting quality is obvious.

## P5 Reporting

Target route: `src/routes/admin/reporting.tsx`

### Layout

- [ ] Keep the page lightweight, but give it a stronger story arc.
- [ ] Replace the plain date-range select with a clearer shared filter control that matches the rest of admin.
- [ ] Organize the page into:
  - top-row KPIs by currency
  - composition modules for entity and category
  - trend modules by currency

### Metrics And Charts

- [ ] Separate currencies visually instead of nesting secondary currencies as subordinate text.
- [ ] Rework the top cards so paid, outstanding, total volume, and invoice count are easy to compare.
- [ ] Add an explicit export action if reporting is meant to support downstream finance workflows.
- [ ] Improve spend-by-category hierarchy with clearer labels and percentage context.
- [ ] Keep labels and values visually attached to chart marks so the eye does not ping-pong across empty space.
- [ ] Replace mixed bar-list trend presentation with cleaner small multiples or grouped series by currency.
- [ ] Rebuild entity split as a deliberate comparison module rather than a small supporting card.

### Done When

- [ ] The page answers what happened, where it happened, and how it changed in that order.
- [ ] Currency handling is clear without mental math.
- [ ] The route feels like a lightweight financial overview, not a list of metric boxes.

## Cross-Cutting QA

- [ ] Review all admin routes at desktop and mobile breakpoints.
- [ ] Verify keyboard navigation and focus states for drawers, sheets, tables, filters, and segmented controls.
- [ ] Verify no primary workflow is blocked behind hover-only controls.
- [ ] Verify route context bands, summaries, tables, and inspectors use consistent spacing and rhythm.
- [ ] Verify status badges, entity tags, buttons, and filters follow one consistent component vocabulary.
- [ ] Verify destructive flows have proportional friction and safe recovery paths.
- [ ] Verify dense screens remain confident and calm at both low-count and high-count data volumes.
- [ ] Verify SV and LP are visually distinct everywhere the admin makes financial decisions.
- [ ] Verify dense pages still load with a calm hierarchy rather than grayscale clutter.

## Final Acceptance

- [ ] Every admin route has a clear focal area within the first viewport.
- [ ] Review feels like triage, processed feels like a ledger, users feels like access control, categories feels like taxonomy management, and reporting feels like a finance overview.
- [ ] The admin feels productized and trustworthy rather than developer-first.
