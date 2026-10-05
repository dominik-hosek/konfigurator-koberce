import { useEffect, useMemo, useRef } from 'react'
import { rgbToHex, type Rgb } from '../lib/color/convert'
import { rankYarns, type PreparedYarn } from '../lib/color/yarns'
import { cs } from '../strings/cs'
import { secondaryButton } from './ui/buttonStyles'

interface YarnPickerProps {
  yarns: readonly PreparedYarn[]
  /** Colour from the image the yarn is chosen for. */
  sourceColor: Rgb
  currentCode: string
  recommendedCode: string
  onSelect: (code: string) => void
  onClose: () => void
}

/** Modal yarn chooser; yarns are sorted by similarity to the source colour. */
export function YarnPicker({
  yarns,
  sourceColor,
  currentCode,
  recommendedCode,
  onSelect,
  onClose,
}: YarnPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const ranked = useMemo(() => rankYarns(sourceColor, yarns), [sourceColor, yarns])

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
      // Start keyboard users on the current choice rather than the close button.
      dialog.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()
    }
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="yarn-picker-title"
      onClose={onClose}
      className="m-auto max-h-[85dvh] w-[min(36rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-900/40"
    >
      <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="size-10 shrink-0 rounded-lg ring-1 ring-black/10 ring-inset"
            style={{ backgroundColor: rgbToHex(sourceColor) }}
          />
          <div>
            <h2 id="yarn-picker-title" className="text-base font-semibold">
              {cs.yarnPicker.title}
            </h2>
            <p className="text-muted text-sm">{cs.yarnPicker.subtitle}</p>
          </div>
        </div>
        <button type="button" className={secondaryButton} onClick={onClose}>
          {cs.yarnPicker.close}
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-2 overflow-y-auto p-5 sm:grid-cols-3">
        {ranked.map(({ yarn }) => {
          const selected = yarn.code === currentCode
          return (
            <li key={yarn.code}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={cs.yarnPicker.option(yarn.name, yarn.code)}
                onClick={() => onSelect(yarn.code)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-2 text-left transition-colors hover:border-stone-500 ${
                  selected ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="size-9 shrink-0 rounded-lg ring-1 ring-black/10 ring-inset"
                  style={{ backgroundColor: yarn.hex }}
                />
                <span aria-hidden="true" className="min-w-0 text-xs leading-snug">
                  <span className="block truncate font-medium">{yarn.name}</span>
                  <span className="text-muted block">{yarn.code}</span>
                  {yarn.code === recommendedCode && (
                    <span className="block text-emerald-800">{cs.yarnPicker.recommended}</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </dialog>
  )
}
