import { useRouter, Link } from '@tanstack/react-router'
import { signOut } from '@/lib/auth-client'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { LogOut, Settings } from 'lucide-react'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function UserMenu({
  name,
  email,
}: {
  name: string
  email?: string | null
}) {
  const router = useRouter()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-[10px] font-semibold text-[var(--background)] transition-opacity hover:opacity-80"
          title={name}
        >
          {getInitials(name)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-0">
        <div className="border-b border-[var(--border)] px-3 py-2.5">
          <div className="truncate text-sm font-medium text-[var(--foreground)]">
            {name}
          </div>
          {email && (
            <div className="truncate text-xs text-[var(--muted-foreground)]">
              {email}
            </div>
          )}
        </div>
        <div className="py-1">
          <Link
            to="/settings"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          >
            <Settings size={14} />
            Settings
          </Link>
          <button
            onClick={() =>
              void signOut({
                fetchOptions: {
                  onSuccess: async () => {
                    await router.invalidate()
                    await router.navigate({ to: '/' })
                  },
                },
              })
            }
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
