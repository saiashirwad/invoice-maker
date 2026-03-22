# Open Questions

## Logo on invoices

Entities (SV, LP) each have their own logo stored in the `entity` table (`logoKey`). These are used on invoices.

**Open question:** Do contractors need their own logo on invoices too? Options:

- Entity logo only (simplest — the "from" side of the invoice shows the entity being invoiced)
- Contractor logo only (contractor is the sender)
- Both (entity logo in a corner, contractor logo next to "From")
- No logo (cleanest, simplest)

## Multi-tax lines

The current form has a single "tax rate (%)" field. The spec says some contractors may need multiple tax lines (e.g., federal 10% + state 5%). For now we're keeping the single field and upgrading later once we know what contractors actually need.

**Future work:** Replace single `taxPercent` with a `tax_line` table supporting N lines, each with name, rate, and computed amount. Also add the tax-inclusive vs tax-exclusive toggle per invoice.
