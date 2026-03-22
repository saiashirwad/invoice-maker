import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

interface FormLabelProps {
  htmlFor?: string
  children: React.ReactNode
  tooltip?: string
  className?: string
}

const labelClass =
  'text-[10px] font-normal uppercase tracking-[0.2em] text-[var(--muted-foreground)]'

export default function FormLabel({
  htmlFor,
  children,
  tooltip,
  className,
}: FormLabelProps) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <label htmlFor={htmlFor} className={className ?? labelClass}>
        {children}
      </label>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              tabIndex={-1}
              className="inline-flex h-3.5 w-3.5 items-center justify-center text-[var(--muted-foreground)] transition-colors hover:text-[var(--emerald)]"
              aria-label="More info"
            >
              <Info size={12} strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {tooltip}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

export { labelClass }
