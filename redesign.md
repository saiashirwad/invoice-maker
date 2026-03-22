# Admin Redesign TODO

Source: `docs/admin-redesign-audit.md`

This file turns the admin audit into an implementation checklist. The goal is not a visual refresh. The goal is to rebuild the admin into a calm finance operations tool with clearer workflow, stronger hierarchy, and better entity separation.

## Working Rules

- Keep SV and LP separation obvious at the layout level, not just as small metadata chips.
- Do not aggregate mixed currencies into one fake total.
- Prefer persistent inspectors and side sheets over modal-first detail flows.
- Optimize for scan speed on dense admin screens.
- Preserve the underlying workflow semantics while improving framing and interaction clarity.

## P0 Foundation

### Cleanup

- [ ] Remove visible dev-only chrome from the product surface.
  Target: `src/routes/__root.tsx`, `src/components/DevRoleSwitcher.tsx`
- [ ] Verify admin routes render without TanStack devtools panels or role-switcher overlap at desktop and mobile widths.
- [ ] Confirm the redesign does not introduce new fake totals for mixed currencies.

### Shared Shell

- [ ] Replace the current thin admin frame with a stronger shell.
  Target: `src/components/AdminLayout.tsx`
- [ ] Add a real page header zone with title, description, contextual summary, and room for one primary action.
- [ ] Widen and quiet the left rail so navigation, page grouping, and entity legend have deliberate space.
- [ ] Establish a consistent content canvas that can support split panes, wide ledgers, and summary rows.
- [ ] Add a right-side utility zone in the header for date context, sync state, or future global filters.

### Shared Design System

- [ ] Create or refactor toward shared admin primitives:
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
- [ ] Standardize typography for operational data.
  Use monospace treatment for invoice IDs, prefixes, and currency amounts.
- [ ] Standardize entity, status, and caution color usage.
- [ ] Define consistent row states for default, hover, selected, focused, caution, and completed.
- [ ] Replace generic centered modals with side sheets or inspector drawers where the task is review or management, not confirmation.

## P1 Review Queue

Target route: `src/routes/admin/index.tsx`

### Layout

- [ ] Replace the current narrow list-first page with a split-pane triage workspace.
- [ ] Add a summary band above the queue with:
  - pending invoice count
  - totals by currency
  - entity split
  - quick anomaly counts if available
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
  - amount changed from last invoice
  - rejection history
  - tax or category concerns when present
- [ ] Add multi-select with a persistent batch action bar.

### Inspector

- [ ] Replace the current dialog-first detail view with a persistent inspector.
- [ ] Show invoice summary, previous invoice comparison, rejection history, tax summary, and full invoice link in one place.
- [ ] Pin approve and reject actions at the bottom of the inspector.
- [ ] Add a resolved transition so approved or rejected items feel completed, not just removed.

### Done When

- [ ] An admin can open `/admin` and identify the next invoice to review within three seconds.
- [ ] Entity and anomaly signals are visible without opening a detail view.
- [ ] The route no longer depends on a centered modal for core review context.

## P2 Processed Ledger

Target route: `src/routes/admin/processed.tsx`

### Layout

- [ ] Rebuild the page as a ledger instead of a long stack of clickable rows.
- [ ] Add a stronger header with result count, active date window, and room for later export or saved views.
- [ ] Add a summary rail for counts by status, totals by currency, and entity split.

### Filters

- [ ] Consolidate status, contractor, category, date range, and sort into one cohesive toolbar.
- [ ] Show active filters as readable chips below the toolbar.
- [ ] Add a clear result sentence describing the current dataset.
- [ ] Make the filter state feel like a mode, not a loose row of pills.

### Ledger Table

- [ ] Replace the stacked rows with a dense table or ledger grid.
- [ ] Include columns for:
  - invoice ID
  - contractor
  - entity
  - category
  - invoice date
  - status
  - amount
- [ ] Keep the table header sticky.
- [ ] Open row details in a right-side drawer instead of a modal.
- [ ] Use restrained status color and monospace metric cells.

### Currency Handling

- [ ] Remove any single-summary pattern that derives currency from the first visible row.
- [ ] Show grouped totals by currency in the summary layer.
- [ ] Preserve per-currency reporting when filters return mixed-currency data.

### Done When

- [ ] The route reads like a trustworthy ledger rather than a long inbox.
- [ ] Filter state is legible at a glance.
- [ ] No mixed-currency result set is summarized as one misleading total.

## P3 Team And Access

Target route: `src/routes/admin/users.tsx`

### Layout

- [ ] Reframe the page as access management, not a compact contact list.
- [ ] Add a stronger page header with role and entity summaries plus a primary `Invite User` action.
- [ ] Add summary cards for contractors, admins, accountants, and any missing assignments.

### Filters And Table

- [ ] Keep search, but redesign role filtering as a clearer segmented control.
- [ ] Add an entity filter.
- [ ] Replace flattened rows with a management table that includes:
  - name
  - role
  - entity
  - invoice prefix
  - invoice count
  - status or activity field when available
  - actions
- [ ] Surface invoice volume and entity assignment as first-class cells.

### Interaction

- [ ] Move add and edit flows into a right-side sheet.
- [ ] Make row hover and row click behavior obvious, especially where contractors and admins differ today.
- [ ] Standardize visual treatment for contractors, admins, and accountants even if their destination flows differ.
- [ ] Add cleaner empty and filtered states.

### Done When

- [ ] A user’s role and entity are readable without parsing a metadata string.
- [ ] Contractor activity is visible as primary information.
- [ ] The page feels like access control, not roster browsing.

## P4 Categories

Target route: `src/routes/admin/categories.tsx`

### Layout

- [ ] Rebuild the page as a lightweight taxonomy manager.
- [ ] Add a header explaining why categories matter to reporting and defaults.
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
- [ ] Make category creation feel deliberate rather than transient.
- [ ] If usage bars remain, make them genuinely readable rather than decorative.
- [ ] Add explicit reassurance copy when renaming affects future reporting labels.

### Done When

- [ ] Category maintenance feels structured and trustworthy.
- [ ] Actions are visible without hunting for hover states.
- [ ] The relationship between categories and reporting quality is obvious.

## P5 Reporting

Target route: `src/routes/admin/reporting.tsx`

### Layout

- [ ] Keep the page lightweight, but give it a stronger story arc.
- [ ] Replace the plain date-range select with a clearer segmented range control.
- [ ] Organize the page into:
  - top-row KPIs by currency
  - composition modules for entity and category
  - trend modules by currency

### Metrics And Charts

- [ ] Separate currencies visually instead of nesting secondary currencies as subordinate text.
- [ ] Rework the top cards so paid, outstanding, total volume, and invoice count are easy to compare.
- [ ] Improve spend-by-category hierarchy with clearer labels and percentage context.
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
- [ ] Verify page headers, summaries, tables, and inspectors use consistent spacing and rhythm.
- [ ] Verify SV and LP are visually distinct everywhere the admin makes financial decisions.
- [ ] Verify dense pages still load with a calm hierarchy rather than grayscale clutter.

## Final Acceptance

- [ ] Every admin route has a clear focal area within the first viewport.
- [ ] Review feels like triage, processed feels like a ledger, users feels like access control, categories feels like taxonomy management, and reporting feels like a finance overview.
- [ ] The admin feels productized and trustworthy rather than developer-first.
