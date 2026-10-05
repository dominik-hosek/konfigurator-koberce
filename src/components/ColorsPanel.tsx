import { limitsConfig } from '../config'
import { rgbToHex, type Rgb } from '../lib/color/convert'
import { cs } from '../strings/cs'
import { Panel } from './ui/Panel'
import { Slider } from './ui/Slider'

interface ColorsPanelProps {
  step: number
  colorCount: number
  palette: readonly Rgb[] | null
  counts: readonly number[] | null
  disabled: boolean
  onColorCountChange: (count: number) => void
}

export function ColorsPanel({
  step,
  colorCount,
  palette,
  counts,
  disabled,
  onColorCountChange,
}: ColorsPanelProps) {
  const total = counts?.reduce((a, b) => a + b, 0) ?? 0
  const { min, max } = limitsConfig.colors

  return (
    <Panel step={step} title={cs.steps.colors} disabled={disabled}>
      <Slider
        label={cs.colors.countLabel}
        value={colorCount}
        min={min}
        max={max}
        hint={cs.colors.countHint}
        disabled={disabled}
        onChange={onColorCountChange}
      />

      {palette && counts && palette.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium">{cs.colors.paletteTitle}</h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {palette.map((rgb, i) => {
              const hex = rgbToHex(rgb)
              const percent = cs.colors.share(total ? (counts[i]! / total) * 100 : 0)
              return (
                <li
                  key={i}
                  aria-label={cs.colors.swatchLabel(i + 1, hex, percent)}
                  className="border-line flex items-center gap-3 rounded-lg border bg-white p-2"
                >
                  <span
                    aria-hidden="true"
                    className="size-8 shrink-0 rounded-md ring-1 ring-black/10 ring-inset"
                    style={{ backgroundColor: hex }}
                  />
                  <span aria-hidden="true" className="min-w-0 text-xs leading-tight">
                    <span className="block font-mono">{hex}</span>
                    <span className="text-muted tabular-nums">{percent}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          {palette.length < colorCount && (
            <p className="text-muted mt-3 text-sm">
              {cs.colors.fewerThanRequested(palette.length)}
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}
