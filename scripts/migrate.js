#!/usr/bin/env node
// Idempotent migration runner: skips already-applied migrations using the _migration journal table.

import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const target = process.argv[2] // 'local' or 'remote'
if (!target || !['local', 'remote'].includes(target)) {
  console.error('Usage: node scripts/migrate.js <local|remote>')
  process.exit(1)
}

const migrationsDir = resolve(import.meta.dirname, '../migrations')
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

if (files.length === 0) {
  console.log('No migrations found.')
  process.exit(0)
}

const flag = target === 'remote' ? '--remote' : '--local'

function exec(cmd) {
  return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] })
}

function execCommand(sql) {
  const raw = exec(
    `pnpm wrangler d1 execute invoice-maker ${flag} --command "${sql.replace(/"/g, '\\"')}"`,
  )
  // Wrangler outputs a header + JSON block — extract just the JSON
  const jsonStart = raw.indexOf('[')
  if (jsonStart === -1) return []
  try {
    const json = JSON.parse(raw.slice(jsonStart))
    // Wrangler returns [{ results: [...], success: true }]
    const first = Array.isArray(json) ? json[0] : json
    return first?.results ?? []
  } catch {
    return []
  }
}

function applyFile(file) {
  const filePath = resolve(migrationsDir, file)
  const sql = readFileSync(filePath, 'utf-8')
  console.log(`  Applying ${file}...`)
  try {
    execSync(
      `pnpm wrangler d1 execute invoice-maker ${flag} --file "${filePath}"`,
      {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )
    console.log(`  ✅ ${file}`)
  } catch (err) {
    console.error(`  ❌ ${file}: ${err.stderr || err.message}`)
    process.exit(1)
  }
}

// Ensure journal table exists
execCommand(
  `CREATE TABLE IF NOT EXISTS _migration (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)`,
)

// Get already-applied migrations
const rows = execCommand(`SELECT name FROM _migration ORDER BY name`)
let applied = new Set(rows.map((r) => r.name))

const pending = files.filter((f) => !applied.has(basename(f, '.sql')))

if (pending.length === 0) {
  console.log('All migrations already applied. Nothing to do.')
  process.exit(0)
}

console.log(`Migrations to apply: ${pending.join(', ')}`)
console.log(`Target: ${target}`)

for (const file of pending) {
  applyFile(file)
  const name = basename(file, '.sql')
  execCommand(
    `INSERT OR IGNORE INTO _migration (name, applied_at) VALUES ('${name}', strftime('%s','now') * 1000)`,
  )
}

console.log('Done.')
