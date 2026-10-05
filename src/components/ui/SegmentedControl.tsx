import { useId } from 'react'

interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}

/** Radio group styled as a segmented switch; arrow keys work natively. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const name = useId()
  return (
    <fieldset className="inline-flex rounded-full bg-stone-100 p-1">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className="cursor-pointer rounded-full px-3 py-1 text-sm text-stone-600 transition-colors has-checked:bg-white has-checked:text-stone-900 has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-stone-800"
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}
