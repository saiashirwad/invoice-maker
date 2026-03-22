import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format, parse } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  id?: string
}

export default function DatePicker({ value, onChange, id }: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const dateValue = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'))
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            'focus-emerald flex h-9 w-full items-center justify-between border-b border-[var(--border)]/75 bg-transparent px-0 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[var(--border)]',
            open && 'border-[var(--emerald)] shadow-[0_1px_0_0_var(--emerald)]',
            !value && 'text-[var(--muted-foreground)]',
          )}
        >
          <span>
            {dateValue ? format(dateValue, 'MMM d, yyyy') : 'Pick a date'}
          </span>
          <CalendarIcon size={14} className="text-[var(--muted-foreground)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto rounded-none p-0 shadow-lg"
        align="start"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          defaultMonth={dateValue}
          className="rounded-none"
        />
      </PopoverContent>
    </Popover>
  )
}
