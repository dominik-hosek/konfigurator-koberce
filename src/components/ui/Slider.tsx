import { useId } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  hint?: string
  disabled?: boolean
  /** Formats the visible value; defaults to the number itself. */
  format?: (value: number) => string
  onChange: (value: number) => void
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  hint,
  disabled,
  format = String,
  onChange,
}: SliderProps) {
  const id = useId()
  const hintId = `${id}-hint`
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <output htmlFor={id} className="text-sm tabular-nums" aria-hidden="true">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="text-muted flex justify-between text-xs tabular-nums" aria-hidden="true">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
      {hint && (
        <p id={hintId} className="text-muted mt-2 text-sm">
          {hint}
        </p>
      )}
    </div>
  )
}
