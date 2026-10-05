interface ProgressBarProps {
  value: number
  label: string
}

/** Thin determinate progress bar; `value` is 0..1. */
export function ProgressBar({ value, label }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1 w-full overflow-hidden rounded-full bg-stone-200"
    >
      <div
        className="h-full bg-stone-800 transition-[width] duration-150 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
