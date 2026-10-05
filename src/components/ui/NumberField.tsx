import { useId, useState } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  unit: string
  min: number
  max: number
  disabled?: boolean
  hint?: string
  onChange: (value: number) => void
}

/** Numeric input that lets the user type freely and reports every valid value. */
export function NumberField({
  label,
  value,
  unit,
  min,
  max,
  disabled,
  hint,
  onChange,
}: NumberFieldProps) {
  const id = useId()
  // While typing we show the raw text; otherwise the (possibly adjusted) value.
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? String(Math.round(value))

  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-stone-800 has-disabled:bg-stone-100">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          className="h-11 w-full min-w-0 rounded-lg bg-transparent px-3 tabular-nums outline-none disabled:text-stone-500"
          value={shown}
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value !== '' && Number.isFinite(n) && n > 0) onChange(n)
          }}
          onBlur={() => setDraft(null)}
        />
        <span className="text-muted pr-3 text-sm" aria-hidden="true">
          {unit}
        </span>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-muted mt-1 text-xs">
          {hint}
        </p>
      )}
    </div>
  )
}
