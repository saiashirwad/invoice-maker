import { env } from 'cloudflare:workers'
import { createDb } from '#/db'

export function getDb() {
  return createDb((env as { DB: D1Database }).DB)
}
