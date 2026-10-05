import { useId, type ReactNode } from 'react'

interface PanelProps {
  step?: number
  title: string
  /** Rendered next to the title, e.g. a secondary action. */
  aside?: ReactNode
  disabled?: boolean
  children: ReactNode
}

/** A numbered configurator step. */
export function Panel({ step, title, aside, disabled, children }: PanelProps) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className={`border-line border-t pt-6 transition-opacity ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="flex items-baseline gap-3 text-base font-semibold">
          {step !== undefined && (
            <span className="text-muted font-normal tabular-nums" aria-hidden="true">
              {String(step).padStart(2, '0')}
            </span>
          )}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
