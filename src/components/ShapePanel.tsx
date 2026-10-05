import { useId } from 'react'
import { limitsConfig } from '../config'
import { canUnlockAspect, isShapeAvailable, type RugShape } from '../lib/geometry/layout'
import { cs } from '../strings/cs'
import type { ProcessResult } from '../workers/protocol'
import { NumberField } from './ui/NumberField'
import { Panel } from './ui/Panel'
import { Slider } from './ui/Slider'

const SHAPES: RugShape[] = ['rectangle', 'circle', 'oval', 'contour']

function ShapeIcon({ shape }: { shape: RugShape }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }
  return (
    <svg viewBox="0 0 32 24" className="h-6 w-8" aria-hidden="true">
      {shape === 'rectangle' && <rect x="3" y="3" width="26" height="18" rx="1.5" {...common} />}
      {shape === 'circle' && <circle cx="16" cy="12" r="9.5" {...common} />}
      {shape === 'oval' && <ellipse cx="16" cy="12" rx="13" ry="9" {...common} />}
      {shape === 'contour' && (
        <path
          d="M6 15c-3-4 0-10 5-9 2-3 8-3 10 0 5-1 8 4 5 8 2 4-3 8-7 6-3 3-8 2-9-1-4 1-7-2-4-4z"
          {...common}
        />
      )}
    </svg>
  )
}

interface ShapePanelProps {
  step: number
  shape: RugShape
  widthMm: number
  heightMm: number | null
  marginMm: number
  result: ProcessResult | null
  onShapeChange: (shape: RugShape) => void
  onWidthChange: (mm: number) => void
  onHeightChange: (mm: number) => void
  onAspectLockChange: (locked: boolean, currentHeightMm: number) => void
  onMarginChange: (mm: number) => void
}

export function ShapePanel({
  step,
  shape,
  widthMm,
  heightMm,
  marginMm,
  result,
  onShapeChange,
  onWidthChange,
  onHeightChange,
  onAspectLockChange,
  onMarginChange,
}: ShapePanelProps) {
  const lockId = useId()
  const { size, margin } = limitsConfig
  const layout = result?.layout
  const motif = result?.motif
  const locked = heightMm === null || !canUnlockAspect(shape)
  // Show what the rug will really be; fall back to the request until the first result.
  const shownWidth = layout?.widthMm ?? widthMm
  const shownHeight = layout?.heightMm ?? heightMm ?? widthMm
  const enclose = layout?.fit === 'enclose'

  return (
    <Panel step={step} title={cs.steps.shape}>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{cs.shape.legend}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {SHAPES.map((s) => {
            const available = !motif || isShapeAvailable(s, motif)
            return (
              <label
                key={s}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border bg-white px-2 py-3 text-xs transition-colors has-checked:border-stone-900 has-checked:ring-1 has-checked:ring-stone-900 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-stone-800 has-disabled:cursor-not-allowed has-disabled:opacity-40 ${
                  available ? 'border-stone-200 hover:border-stone-500' : 'border-stone-200'
                }`}
              >
                <input
                  type="radio"
                  name="rug-shape"
                  value={s}
                  className="sr-only"
                  checked={shape === s}
                  disabled={!available}
                  onChange={() => onShapeChange(s)}
                />
                <ShapeIcon shape={s} />
                {cs.shape.names[s]}
              </label>
            )
          })}
        </div>
        {motif && !motif.hasBackground && (
          <p className="text-muted mt-2 text-xs">{cs.shape.contourUnavailable}</p>
        )}
        {layout?.fit === 'crop' && (shape === 'circle' || shape === 'oval') && (
          <p className="text-muted mt-2 text-xs">{cs.shape.cropHint}</p>
        )}
      </fieldset>

      <div className="mt-6 flex gap-3">
        <NumberField
          label={cs.shape.width}
          unit={cs.shape.unit}
          value={shownWidth / 10}
          min={size.minWidthMm / 10}
          max={size.maxWidthMm / 10}
          hint={cs.shape.range(size.minWidthMm, size.maxWidthMm)}
          onChange={(cmValue) => onWidthChange(cmValue * 10)}
        />
        <NumberField
          label={cs.shape.height}
          unit={cs.shape.unit}
          value={shownHeight / 10}
          min={size.minHeightMm / 10}
          max={size.maxHeightMm / 10}
          disabled={locked}
          hint={cs.shape.range(size.minHeightMm, size.maxHeightMm)}
          onChange={(cmValue) => onHeightChange(cmValue * 10)}
        />
      </div>

      {canUnlockAspect(shape) ? (
        <label htmlFor={lockId} className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
          <input
            id={lockId}
            type="checkbox"
            className="size-4 accent-stone-800"
            checked={locked}
            onChange={(e) => onAspectLockChange(e.target.checked, shownHeight)}
          />
          {cs.shape.lockAspect}
        </label>
      ) : (
        shape !== 'circle' && <p className="text-muted mt-3 text-xs">{cs.shape.heightDerived}</p>
      )}

      {enclose && (
        <div className="mt-6">
          <Slider
            label={cs.shape.margin}
            value={Math.round(marginMm / 10)}
            min={0}
            max={Math.round(margin.maxMm / 10)}
            format={(v) => cs.shape.marginValue(v * 10)}
            hint={cs.shape.marginHint}
            onChange={(v) => onMarginChange(v * 10)}
          />
        </div>
      )}

      {layout && result && (
        <div className="mt-5 text-sm" aria-live="polite">
          <p className="font-medium tabular-nums">
            {cs.shape.summary(layout.widthMm, layout.heightMm, result.areaM2)}
          </p>
          {layout.adjusted && (
            <p className="mt-1 text-amber-800">
              {cs.shape.adjusted(
                cs.shape.range(
                  Math.min(size.minWidthMm, size.minHeightMm),
                  Math.max(size.maxWidthMm, size.maxHeightMm),
                ),
              )}
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}
