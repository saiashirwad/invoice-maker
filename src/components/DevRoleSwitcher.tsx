import { useState, useEffect } from 'react'
import { useRouter, useNavigate } from '@tanstack/react-router'

const personas = [
  { key: 'user', label: 'User', path: '/user', color: 'bg-gray-500' },
  { key: 'admin', label: 'Admin', path: '/admin', color: 'bg-blue-500' },
  {
    key: 'accountant',
    label: 'Accountant',
    path: '/accountant',
    color: 'bg-amber-500',
  },
] as const

export default function DevRoleSwitcher() {
  const router = useRouter()
  const navigate = useNavigate()
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const match = document.cookie.match(/dev-persona=(admin|user|accountant)/)
    setActive(match?.[1] ?? 'admin')
  }, [])

  if (active === null) return null

  function switchTo(persona: (typeof personas)[number]) {
    document.cookie = `dev-persona=${persona.key};path=/;max-age=86400`
    setActive(persona.key)
    void router.invalidate().then(() => {
      void navigate({ to: persona.path })
    })
  }

  return (
    <div className="fixed bottom-3 left-3 z-50 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 shadow-lg print:hidden">
      <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
        Dev
      </span>
      {personas.map((p) => (
        <button
          key={p.key}
          onClick={() => switchTo(p)}
          className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
            active === p.key
              ? `${p.color} text-white`
              : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)]'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
