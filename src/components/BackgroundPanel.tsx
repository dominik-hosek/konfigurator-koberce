import { useId } from 'react'
import { rgbToHex } from '../lib/color/convert'
import type { BackgroundSettings, ResolvedBackgroundMode } from '../lib/image/background'
import { cs } from '../strings/cs'
import { secondaryButton, textButton } from './ui/buttonStyles'
import { Panel } from './ui/Panel'
import { Slider } from './ui/Slider'

interface BackgroundPanelProps {
  step: number
  settings: BackgroundSettings
  /** Mode the worker actually applied (resolves 'auto'). */
  resolvedMode: ResolvedBackgroundMode | null
  /** Share of the image (0..100) that is background in the current result. */
  removedPercent: number | null
  picking: boolean
  detectFailed: boolean
  onTogglePicking: () => void
  onDetect: () => void
  onReset: () => void
  onToleranceChange: (tolerance: number) => void
  onEnclosedChange: (removeEnclosed: boolean) => void
}

export function BackgroundPanel({
  step,
  settings,
  resolvedMode,
  removedPercent,
  picking,
  detectFailed,
  onTogglePicking,
  onDetect,
  onReset,
  onToleranceChange,
  onEnclosedChange,
}: BackgroundPanelProps) {
  const enclosedId = useId()
  const colorMode = settings.mode === 'color' ? settings : null

  return (
    <Panel step={step} title={cs.steps.background}>
      <p className="text-muted mb-4 text-sm">
        {resolvedMode === 'alpha' ? cs.background.alphaDetected : cs.background.intro}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} onClick={onDetect}>
          {cs.background.detect}
        </button>
        <button
          type="button"
          className={secondaryButton}
          aria-pressed={picking}
          onClick={onTogglePicking}
        >
          {picking
            ? cs.background.pickCancel
            : colorMode
              ? cs.background.pickMore
              : cs.background.pick}
        </button>
      </div>

      <div aria-live="polite" className="mt-3 text-sm">
        {picking && <p className="text-stone-700">{cs.background.pickHint}</p>}
        {detectFailed && !picking && <p className="text-amber-800">{cs.background.detectFailed}</p>}
      </div>

      {colorMode && (
        <div className="mt-5 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="text-sm">{cs.background.pickedColors}</span>
            <ul className="flex flex-wrap gap-1.5">
              {colorMode.colors.map((c, i) => (
                <li
                  key={i}
                  title={rgbToHex(c)}
                  className="size-6 rounded ring-1 ring-black/15 ring-inset"
                  style={{ backgroundColor: rgbToHex(c) }}
                >
                  <span className="sr-only">{rgbToHex(c)}</span>
                </li>
              ))}
            </ul>
          </div>

          <Slider
            label={cs.background.tolerance}
            value={colorMode.tolerance}
            min={2}
            max={50}
            hint={cs.background.toleranceHint}
            onChange={onToleranceChange}
          />

          <label htmlFor={enclosedId} className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              id={enclosedId}
              type="checkbox"
              className="mt-0.5 size-4 accent-stone-800"
              checked={!colorMode.contiguous}
              onChange={(e) => onEnclosedChange(e.target.checked)}
            />
            {cs.background.enclosed}
          </label>

          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {removedPercent !== null && (
              <p className="text-muted text-sm">{cs.background.removedShare(removedPercent)}</p>
            )}
            <button type="button" className={textButton} onClick={onReset}>
              {cs.background.reset}
            </button>
          </div>
        </div>
      )}
    </Panel>
  )
}
