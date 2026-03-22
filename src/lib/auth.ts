import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { drizzle } from 'drizzle-orm/d1'
import { env } from 'cloudflare:workers'
import { authSchema } from '#/db/schema/auth'
import type { AppSession } from './auth-client'

export interface AuthEnv {
  DB: D1Database
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
}

const DEV_PERSONAS = {
  admin: {
    id: 'dev-user',
    name: 'Dev User',
    email: 'dev@localhost',
    role: 'admin' as const,
    entityId: 'entity-sv',
    invoicePrefix: 'JD',
  },
  user: {
    id: 'dev-contractor',
    name: 'Jane Contractor',
    email: 'jane@localhost',
    role: 'user' as const,
    entityId: 'entity-sv',
    invoicePrefix: 'JC',
  },
  accountant: {
    id: 'accountant-sv',
    name: 'Alice Accountant',
    email: 'alice@sv.test',
    role: 'accountant' as const,
    entityId: 'entity-sv',
    invoicePrefix: '',
  },
} as const

export type DevPersona = keyof typeof DEV_PERSONAS

function buildDevSession(persona: DevPersona): AppSession {
  const p = DEV_PERSONAS[persona]
  return {
    user: {
      ...p,
      image: null,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'dev-session',
      token: 'dev-token',
      userId: p.id,
      expiresAt: new Date(Date.now() + 86400000),
    },
  } as AppSession
}

export const DEV_SESSION = buildDevSession('admin')

export function createAuth(authEnv: AuthEnv) {
  const db = drizzle(authEnv.DB)

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema,
    }),
    user: {
      additionalFields: {
        role: {
          type: ['user', 'admin', 'accountant'],
          required: false,
          defaultValue: 'user',
          input: false,
        },
        entityId: {
          type: 'string',
          required: false,
          input: false,
        },
        invoicePrefix: {
          type: 'string',
          required: false,
          input: false,
        },
      },
    },
    socialProviders: {
      google: {
        clientId: authEnv.GOOGLE_CLIENT_ID,
        clientSecret: authEnv.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [tanstackStartCookies()],
    secret: authEnv.BETTER_AUTH_SECRET,
    baseURL: authEnv.BETTER_AUTH_URL,
  })
}

export function getAuth() {
  return createAuth(env as AuthEnv)
}

export async function getServerSession(request: Request): Promise<AppSession> {
  if (import.meta.env.DEV) {
    const cookie = request.headers.get('cookie') ?? ''
    const match = cookie.match(/dev-persona=(admin|user|accountant)/)
    const persona = (match?.[1] ?? 'admin') as DevPersona
    return buildDevSession(persona)
  }

  const session = await getAuth().api.getSession({
    headers: request.headers,
  })

  return session ?? null
}
