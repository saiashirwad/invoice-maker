import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { CURRENCIES } from './useInvoice'

interface CurrencyComboboxProps {
  value: string
  onChange: (value: string) => void
}

export default function CurrencyCombobox({
  value,
  onChange,
}: CurrencyComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = CURRENCIES.find((c) => c.code === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'focus-emerald flex h-9 w-full items-center justify-between border-b border-[var(--border)]/75 bg-transparent px-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[var(--border)]',
            open && 'border-[var(--emerald)] shadow-[0_1px_0_0_var(--emerald)]',
          )}
        >
          <span className="flex items-center gap-2">
            {selected && (
              <span className="text-sm leading-none">{selected.flag}</span>
            )}
            <span className="font-medium">
              {selected
                ? selected.symbol !== selected.code
                  ? `${selected.symbol} ${selected.code}`
                  : selected.code
                : 'Select'}
            </span>
            {selected && (
              <span className="text-[var(--muted-foreground)]">
                {selected.name}
              </span>
            )}
          </span>
          <ChevronsUpDown
            size={13}
            className="shrink-0 text-[var(--muted-foreground)]"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] rounded-none border-[var(--border)] p-0 shadow-lg"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder="Search..." className="text-sm" />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {CURRENCIES.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} ${currency.name} ${currency.symbol}`}
                  onSelect={() => {
                    onChange(currency.code)
                    setOpen(false)
                  }}
                  className="flex items-center gap-3 rounded-none py-2.5 text-sm"
                >
                  <span className="w-5 text-sm leading-none">
                    {currency.flag}
                  </span>
                  <span className="w-10 font-medium">{currency.code}</span>
                  <span className="w-9 text-[var(--muted-foreground)]">
                    {currency.symbol}
                  </span>
                  <span className="flex-1 text-[var(--muted-foreground)]">
                    {currency.name}
                  </span>
                  <Check
                    size={14}
                    className={cn(
                      'shrink-0',
                      value === currency.code
                        ? 'text-[var(--emerald)] opacity-100'
                        : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
