# Invoice Maker

Internal invoicing tool for two entities (SV, LP). Contractors create invoices, admins manage them, accountants mark them paid. See `spec.md` for full requirements. Uses TanStack Start + React on Cloudflare Workers.

## Dev Server

Tmux session: `invoice-maker`

- Check: `tmux has-session -t invoice-maker`
- Logs: `tmux capture-pane -t invoice-maker -p -S -100`
- Start: `tmux new-session -d -s invoice-maker -c /Users/texoport/work/invoice-maker && tmux send-keys -t invoice-maker "pnpm dev" Enter`
- Stop: `tmux kill-session -t invoice-maker`

On session start, check if running — start if not. Dev server runs on `:3000`.

## Auth

Dev mode bypasses auth with a mock user (no login needed). Navigate directly to `/user`.
`src/lib/auth.ts` returns a DEV session from `getServerSession()` in DEV mode.
`src/lib/route-auth.ts` reads `context.session` from the TanStack Start root route and redirects if absent.

## Commands

- `pnpm dev` — Start the TanStack Start dev server on `:3000`
- `pnpm build` — Build client and server bundles for TanStack Start (`dist/client`, `dist/server`)
- `pnpm deploy` — Build + deploy to Cloudflare Workers
- `pnpm test` — Vitest
- `pnpm check` — Prettier + ESLint fix
- `pnpm db:migrate:local` — Run D1 migration locally
- `pnpm db:migrate:remote` — Run D1 migration remotely

## RULES

- no `as any` or `as unknown` in code (except for in the lib/ folder)
