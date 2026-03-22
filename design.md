# Admin Design Spec

This file is the design-system companion to `redesign.md`.

Use `redesign.md` for implementation sequencing and route-by-route TODOs.
Use this file for the design language, tokens, component rules, and interaction behavior that should guide implementation.

## Design Principles

1. Calm authority.
   This is a financial operations tool. The interface should feel precise, quiet, and trustworthy.
2. Scannable density.
   Dense enough for fast work, but never visually noisy or cramped.
3. One vocabulary.
   Components, color meaning, and interaction patterns should be learnable once and reused everywhere.
4. Monochrome first.
   The interface should rely on value, contrast, spacing, and type before color. Strong color should appear only in rare cases where meaning would otherwise be missed.
5. Numbers win.
   In financial rows and summaries, amounts must carry equal or greater weight than names and metadata.
6. Motion is information.
   Animation should explain state changes, not decorate the surface.

## Layout And Reading Context

- Keep content left-aligned for scanning.
- Avoid marketing-style centered canvases for admin work.
- The shell should support:
  - compact operational pages
  - wide ledgers
  - split-pane review flows
- Low-count states must still feel deliberate.
  Avoid the current large white void when only a few items are present.
- Summary modules should not create a separate reading context through dark inversion.
  Prefer white surfaces with stronger type and restrained grayscale contrast.

### Shell Structure

- Sidebar width: `240px`
- Collapsed sidebar width, if implemented later: `56px`
- Content top padding: `32px`
- Content horizontal padding: `40px`
- Content max width for standard pages: `1080px`
- Wide ledger pages may exceed that when needed, but should still preserve alignment and spacing discipline.
- The shell should feel closer to Stripe Dashboard or Linear than generic dashboard boilerplate, but with a quieter finance tone.

### Section Spacing

Base spacing unit: `4px`

| Token      | Value  | Usage                                     |
| ---------- | ------ | ----------------------------------------- |
| `space-1`  | `4px`  | icon gaps, badge padding                  |
| `space-2`  | `8px`  | inline gaps, chip spacing                 |
| `space-3`  | `12px` | row padding, label-to-input gap           |
| `space-4`  | `16px` | field spacing, compact card padding       |
| `space-5`  | `20px` | toolbar-to-content gap                    |
| `space-6`  | `24px` | standard card padding, drawer padding     |
| `space-8`  | `32px` | major section breaks                      |
| `space-10` | `40px` | page side padding                         |
| `space-12` | `48px` | large section breaks, page bottom padding |

Use visibly different spacing for:

- route context bands
- summary modules
- toolbars
- dense tables and record lists

### Dense Row Specs

| Property               | Value                                            |
| ---------------------- | ------------------------------------------------ |
| two-line row height    | `52px`                                           |
| single-line row height | `40px`                                           |
| row padding            | `12px` vertical, `16px` horizontal               |
| separator              | `1px solid border-subtle`                        |
| hover surface          | `bg-surface-sunken`                              |
| selected surface       | `accent-primary-subtle` plus clear active marker |

Column alignment should be stable across ledger-like views:

- leading selection or marker zone
- identity zone
- date or metadata zone
- right-aligned amount zone
- trailing action zone

## Typography

### Fonts

- Primary UI font: `Inter`
- Monospace font: `JetBrains Mono`
- Enable `font-variant-numeric: tabular-nums` where numbers are compared vertically

### Type Scale

| Token            | Size   | Line Height | Use                                  |
| ---------------- | ------ | ----------- | ------------------------------------ |
| `text-2xl`       | `24px` | `32px`      | major route labels when needed       |
| `text-xl`        | `20px` | `28px`      | large module headings, major figures |
| `text-lg`        | `16px` | `24px`      | section headings                     |
| `text-base`      | `14px` | `20px`      | default body text                    |
| `text-sm`        | `13px` | `18px`      | secondary metadata, labels           |
| `text-xs`        | `11px` | `16px`      | tertiary metadata, table headers     |
| `text-mono-lg`   | `20px` | `28px`      | large financial figures              |
| `text-mono-base` | `14px` | `20px`      | amounts and identifiers in rows      |
| `text-mono-sm`   | `13px` | `18px`      | secondary financial detail           |

### Weight Rules

- Default body weight: `500`
- Use `600` for active nav, section headings, primary names, and emphasized labels
- Use `700` only for the single most important number in a module
- Reserve `400` for tertiary or assistive text only

### Text Treatment Rules

- Use sentence case for labels, headings, controls, and helper text
- Use uppercase only for true column headers if needed
- Use monospace for:
  - invoice IDs
  - invoice prefixes
  - currency amounts
  - email addresses when they need exact scanning
- Keep dates in the proportional font

### Text Colors

| Token            | Hex       | Usage                                                           |
| ---------------- | --------- | --------------------------------------------------------------- |
| `text-primary`   | `#1A1A1A` | names, amounts, headings                                        |
| `text-secondary` | `#6B6B6B` | dates, labels, metadata                                         |
| `text-tertiary`  | `#9C9C9C` | low-emphasis annotations                                        |
| `text-disabled`  | `#BFBFBF` | disabled controls, placeholders                                 |
| `text-inverse`   | `#FFFFFF` | text on dark surfaces if ever needed                            |
| `text-link`      | `#2E2E2E` | links and linked IDs                                            |
| `text-success`   | `#1A1A1A` | positive state detail when neutral treatment is enough          |
| `text-danger`    | `#1A1A1A` | destructive or rejected detail when neutral treatment is enough |

## Color System

### Core Surface Tokens

| Token               | Hex                 | Usage                                |
| ------------------- | ------------------- | ------------------------------------ |
| `bg-page`           | `#FAFAFA`           | page background                      |
| `bg-surface`        | `#FFFFFF`           | cards, tables, drawers               |
| `bg-surface-sunken` | `#F5F5F4`           | inputs, headers, inset areas         |
| `bg-sidebar`        | `#F7F7F6`           | sidebar                              |
| `bg-overlay`        | `rgba(9,9,11,0.50)` | backdrop                             |
| `border-default`    | `#E8E8E6`           | default borders                      |
| `border-subtle`     | `#F0F0EE`           | soft separators                      |
| `border-strong`     | `#D4D4D1`           | stronger boundaries, active outlines |

### Accent Tokens

Default to monochrome interaction treatment. Accent color is not part of the everyday visual language. Use grayscale values for focus, selection, and active state unless a rare high-importance exception truly benefits from color.

| Token                   | Hex       | Usage                                  |
| ----------------------- | --------- | -------------------------------------- |
| `accent-primary`        | `#1F1F1F` | primary interaction emphasis           |
| `accent-primary-hover`  | `#141414` | hover                                  |
| `accent-primary-active` | `#0F0F0F` | pressed state                          |
| `accent-primary-subtle` | `#F1F1EF` | selected rows, active chip backgrounds |
| `accent-primary-muted`  | `#D8D8D4` | subtle supporting emphasis             |

### Status Tokens

Keep semantic meanings distinct, but do not default to loud color fills. Most status expression should come from label, shape, iconography, and tonal contrast. Strong status color should be reserved for the rarest cases where the risk of confusion is materially high.

| Status              | Dot       | Text      | Background |
| ------------------- | --------- | --------- | ---------- |
| Approved            | `#3A3A3A` | `#1A1A1A` | `#F1F1EF`  |
| Rejected            | `#3A3A3A` | `#1A1A1A` | `#F1F1EF`  |
| Paid                | `#3A3A3A` | `#1A1A1A` | `#F1F1EF`  |
| Submitted / Pending | `#3A3A3A` | `#1A1A1A` | `#F1F1EF`  |
| Draft               | `#8B8B8B` | `#6B6B6B` | `#F0F0EE`  |
| Outstanding         | `#3A3A3A` | `#1A1A1A` | `#F1F1EF`  |

### Role Tokens

| Role       | Background | Text      |
| ---------- | ---------- | --------- |
| Admin      | `#EDEDFC`  | `#4750A8` |
| Contractor | `#FFF3E0`  | `#C45D00` |
| Accountant | `#DDF4F6`  | `#1B7C83` |

### Interactive Tokens

| Token                     | Hex                   | Usage                   |
| ------------------------- | --------------------- | ----------------------- |
| `interactive-hover-bg`    | `#F5F5F4`             | row hover               |
| `interactive-active-bg`   | `#F1F1EF`             | selected state          |
| `interactive-focus-ring`  | `rgba(26,26,26,0.18)` | focus ring              |
| `button-primary-bg`       | `#1F1F1F`             | primary actions         |
| `button-secondary-border` | `#D4D4D1`             | secondary buttons       |
| `button-danger-bg`        | `#CF222E`             | destructive buttons     |
| `chip-active-bg`          | `#F1F1EF`             | active filter chips     |
| `chip-active-text`        | `#1A1A1A`             | active filter chip text |

## Shared Component Vocabulary

### Buttons

Use one hierarchy consistently:

| Variant       | Visual                | Use                                   |
| ------------- | --------------------- | ------------------------------------- |
| `primary`     | filled accent         | main action in a region               |
| `secondary`   | outlined              | secondary actions                     |
| `ghost`       | text / low-emphasis   | filters, tertiary actions             |
| `destructive` | red treatment         | delete, reject, destructive confirms  |
| `icon-only`   | icon, no heavy chrome | close, overflow, compact row controls |

Rules:

- Do not use multiple competing filled buttons in the same region
- A row-level action can be `secondary` when the page already has a stronger primary action
- Reject and delete should never look neutral

### Badges And Chips

Use one vocabulary:

| Variant        | Structure                                 | Use                        |
| -------------- | ----------------------------------------- | -------------------------- |
| `status`       | dot + label in restrained tonal treatment | invoice status             |
| `label`        | neutral fill pill                         | roles or taxonomy labels   |
| `entity`       | outlined pill                             | SV / LP entity             |
| `count`        | neutral pill                              | counts in nav or tabs      |
| `notification` | small dot                                 | needs-attention indicators |

Rules:

- Do not mix plain text, dots, and pills for the same semantic concept
- Entity tags must not visually read like statuses
- Status treatment should be consistent across review, processed, users, and detail views

### Inputs

All inputs should share one shell:

- Height: `36px`
- Border: `1px solid border-default`
- Radius: `8px`
- Padding: `12px`
- Focus: `accent-primary` border and focus ring

Supported subtypes:

- `TextInput`
- `Select`
- `Combobox`
- `DateInput`

All dropdown panels should share:

- same radius
- same shadow
- max height around `280px`
- item height `36px`

### Filters

Use one filter pattern across admin list pages:

- chip-like or ghost trigger with icon and chevron
- active state uses subtle accent background, not black fill
- active chips include a clear affordance
- show `Clear all` when 2 or more filters are active
- filter state should be visible without reopening panels

Behavior:

- serialize working filters to URL params
- persist last-used filters only where it helps repeat workflows
- use tabs only for materially different views, not normal filtering

### Navigation

Sidebar rules:

- sidebar items should feel compact and deliberate, not oversized
- active item uses stronger text and a slim left accent border
- counts in nav use a neutral count pill rather than status styling

Tabs:

- use only for genuinely distinct states or views
- active tab should use a clear accent underline or equivalent active marker

Route context band:

- **Removed.** No top context band on any admin route. Route-level context (counts, labels, actions) should live inside the page content, not a shell-level band.

### List Rows

Use a stable row anatomy whenever possible:

```
[leading] [content block] [trailing meta] [trailing action]
```

Leading:

- checkbox
- avatar
- status marker

Content block:

- primary identity
- supporting metadata
- badges when needed

Trailing meta:

- date
- amount
- count

Trailing action:

- row action button
- overflow button
- nothing when the row itself is the only affordance

Rules:

- One row should have one dominant click target
- Selection, open-detail, and primary action must not fight each other
- Amounts should be right-aligned in ledger-like layouts
- Entity grouping can use section headers or slim left-edge accents where it improves scan speed

### Drawers, Inspectors, And Modals

- Use split panes or inspectors for review and high-frequency management work
- Use right-side drawers for archive/detail browsing where the list should remain visible
- Use centered modals for:
  - simple forms
  - confirmations
  - short create flows

Suggested widths:

- `sm`: `400px`
- `md`: `520px`
- `lg`: `680px`

Detail view patterns:

- review queue: split-pane with persistent inspector
- processed ledger: right-side drawer
- narrow viewports: slide-over or drawer patterns instead of heavy modal interruption

## Motion And Feedback

### Duration Tokens

| Token                | Duration | Use                                  |
| -------------------- | -------- | ------------------------------------ |
| `--duration-instant` | `0ms`    | checkbox fill, focus ring            |
| `--duration-fast`    | `120ms`  | hover, icon reveal, chip toggle      |
| `--duration-normal`  | `200ms`  | drawers, toasts, dropdowns           |
| `--duration-slow`    | `300ms`  | backdrop fades, larger layout shifts |

### Easing Tokens

| Token           | Curve                            | Use             |
| --------------- | -------------------------------- | --------------- |
| `--ease-out`    | `cubic-bezier(0.16, 1, 0.3, 1)`  | most enters     |
| `--ease-in`     | `cubic-bezier(0.7, 0, 0.84, 0)`  | exits           |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | layout movement |

### Motion Rules

- Hover states should be restrained and fast
- Selection should be visually obvious but not flashy
- Bulk action bars should slide or fade in clearly enough to explain that the mode changed
- Drawer and modal transitions should communicate depth without feeling heavy
- Respect `prefers-reduced-motion`

Loading rules:

- use skeletons that match the real geometry of rows and modules
- reveal real content without flashy stagger effects
- dense pages should feel immediately structured even while loading

### Toast Rules

- Non-destructive toasts can auto-dismiss quickly
- Destructive toasts should support undo where the action is safely reversible
- Use bottom-right placement unless the current app shell establishes a different global pattern

### Destructive Action Tiers

| Risk   | Example                       | Pattern                                        |
| ------ | ----------------------------- | ---------------------------------------------- |
| Low    | delete empty category         | single click plus undo                         |
| Medium | delete category with invoices | explicit confirmation with consequence text    |
| High   | reject invoice                | explicit confirmation with strong state change |

## Keyboard And Power-User Behavior

Support keyboard handling where it materially improves repetitive admin work:

| Key       | Action                       | Context         |
| --------- | ---------------------------- | --------------- |
| `J` / `K` | move between rows            | list pages      |
| `A`       | approve focused invoice      | review          |
| `R`       | reject focused invoice       | review          |
| `X`       | toggle checkbox              | review          |
| `Enter`   | open detail                  | row-based pages |
| `Escape`  | close overlay or cancel edit | global          |
| `/`       | focus search                 | list pages      |
| `Shift+A` | approve selected             | review          |

## Information Architecture

- The admin workspace should feel like one system across:
  - review
  - processed
  - users
  - categories
  - reporting
- Context should come from:
  - nav state
  - operational counts
  - active filters
  - summary modules
- Do not rely on explanatory marketing copy to orient users who already know the domain
- Keep current scope visible near the work area when results are filtered or paginated

Empty-state rules:

- zero-state pages should have a deliberate empty presentation, not just missing content
- filtered empty states should explain that no results match the current filters and offer a clear reset path
- low-count states should still preserve hierarchy and density

## Page-Specific Design Notes

These are visual and interaction decisions that should be read alongside the route TODOs in `redesign.md`.

### Review

- Use split-pane triage on desktop
- Keep low-count states visually intentional
- Optional state partitions such as `Pending`, `Approved Today`, `Rejected`, and `All Activity` are valid if they support queue management better than a single flat view
- Promote anomaly signals such as:
  - first invoice
  - aging
  - amount changed
  - rejection history
- Remove `Approve 0`
- Keep approve and reject actions persistently visible in the inspector
- Support fast repeat review with keyboard shortcuts and auto-advance

### Processed

- Treat the route as a ledger, not an inbox
- Use sticky column headers
- Use monospace, right-aligned amounts
- Keep filter state visible near the results
- Replace ambiguous `Load more` behavior with visible dataset scope
- Prefer a right drawer over a centered modal for row detail

### Users

- Treat the route as access management, not a contact list
- Use clear role badge distinctions
- Keep activity and entity assignment visible in the main table
- Prefer a side sheet for add and edit flows
- Search and filtering should feel like one toolbar, not disconnected controls

### Categories

- Keep bars only if they communicate real volume clearly
- Put values close to bars
- Avoid hover-only editing on sparse layouts
- Add consequence-aware confirmation for deletes that affect existing invoices

### Reporting

- Use white summary cards, not dark hero cards
- Use the shared filter/select style, not native browser selects
- Keep chart labels visually attached to values
- Separate currencies clearly instead of nesting them as subordinate text
- Add export only if it supports a real downstream finance workflow

## Implementation Notes

- `redesign.md` should stay focused on execution order and acceptance criteria
- This file should hold the design language and reusable rules
- If design decisions change, update this file first and then reconcile the impacted TODOs in `redesign.md`
