import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  plugins: [],
})

export type AppSession = Awaited<
  ReturnType<typeof authClient.getSession>
>['data']

export const { signIn, signOut, useSession } = authClient
