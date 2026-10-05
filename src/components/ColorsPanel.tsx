import { useState, type ReactNode } from 'react'
import { limitsConfig } from '../config'
import { rgbToHex, type Rgb } from '../lib/color/convert'
import type { PreparedYarn } from '../lib/color/yarns'
import { cs } from '../strings/cs'
import type { ProcessResult } from '../workers/protocol'
import { textButton } from './ui/buttonStyles'
import { Panel } from './ui/Panel'
import { Slider } from './ui/Slider'
import { YarnPicker } from './YarnPicker'

interface ColorsPanelProps {
  step: number
  colorCount: number
  result: ProcessResult | null
  yarns: readonly PreparedYarn[]
  onColorCountChange: (count: number) => void
  onYarnChange: (cluster: number, code: string | null) => void
  onBackgroundYarnChange: (code: string | null) => void
}

interface YarnRowProps {
  yarn: PreparedYarn
  sourceColor: Rgb | null
  details: ReactNode
  changeLabel: string
  custom: boolean
  onChange: () => void
  onRestore: () => void
}

function YarnRow({
  yarn,
  sourceColor,
  details,
  changeLabel,
  custom,
  onChange,
  onRestore,
}: YarnRowProps) {
  return (
    <li className="border-line flex items-center gap-3 rounded-xl border bg-white p-2 pr-3">
      {sourceColor && (
        <span
          title={`${cs.colors.sourceColor}: ${rgbToHex(sourceColor)}`}
          aria-hidden="true"
          className="size-4 shrink-0 rounded-full ring-1 ring-black/10 ring-inset"
          style={{ backgroundColor: rgbToHex(sourceColor) }}
        />
      )}
      <span
        aria-hidden="true"
        className="size-10 shrink-0 rounded-lg ring-1 ring-black/10 ring-inset"
        style={{ backgroundColor: yarn.hex }}
      />
      <div className="min-w-0 flex-1 text-sm leading-tight">
        <p className="truncate font-medium">{yarn.name}</p>
        <p className="text-muted text-xs">
          {details}
          {custom && <> · {cs.colors.custom}</>}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button type="button" className={textButton} aria-label={changeLabel} onClick={onChange}>
          {cs.colors.change}
        </button>
        {custom && (
          <button type="button" className={`${textButton} text-xs`} onClick={onRestore}>
            {cs.colors.restore}
          </button>
        )}
      </div>
    </li>
  )
}

export function ColorsPanel({
  step,
  colorCount,
  result,
  yarns,
  onColorCountChange,
  onYarnChange,
  onBackgroundYarnChange,
}: ColorsPanelProps) {
  const [editing, setEditing] = useState<number | 'fill' | null>(null)
  const { min, max } = limitsConfig.colors
  const byCode = new Map(yarns.map((y) => [y.code, y]))

  const clusters = result?.clusters ?? []
  const total = clusters.reduce((sum, c) => sum + c.count, 0)
  const distinctYarns = new Set(clusters.map((c) => c.yarn)).size
  // Clusters whose yarn vanished entirely during smoothing are too small to tuft.
  const finalYarns = new Set(result?.yarns.map((y) => y.code))
  const dropped = [
    ...new Set(clusters.filter((c) => !finalYarns.has(c.yarn)).map((c) => c.yarn)),
  ].flatMap((code) => byCode.get(code)?.name ?? [])
  const fill = result?.fill.used ? result.fill : null
  const fillYarn = fill ? byCode.get(fill.yarn) : undefined

  const picker =
    editing === 'fill' && fill
      ? {
          sourceColor: fill.sourceColor,
          current: fill.yarn,
          recommended: fill.autoYarn,
          select: (code: string) => onBackgroundYarnChange(code === fill.autoYarn ? null : code),
        }
      : typeof editing === 'number' && clusters[editing]
        ? {
            sourceColor: clusters[editing].color,
            current: clusters[editing].yarn,
            recommended: clusters[editing].autoYarn,
            select: (code: string) =>
              onYarnChange(editing, code === clusters[editing]!.autoYarn ? null : code),
          }
        : null

  return (
    <Panel step={step} title={cs.steps.colors}>
      <Slider
        label={cs.colors.countLabel}
        value={colorCount}
        min={min}
        max={max}
        hint={cs.colors.countHint}
        onChange={onColorCountChange}
      />

      {result && clusters.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium">{cs.colors.paletteTitle}</h3>
          <p className="mb-3 text-sm">{cs.colors.yarnSummary(result.yarns.length)}</p>

          <ul className="flex flex-col gap-2">
            {clusters.map((cluster, i) => {
              const yarn = byCode.get(cluster.yarn)
              if (!yarn || !finalYarns.has(cluster.yarn)) return null
              return (
                <YarnRow
                  key={i}
                  yarn={yarn}
                  sourceColor={cluster.color}
                  details={
                    <>
                      {yarn.code} · {cs.colors.share(total ? (cluster.count / total) * 100 : 0)}
                    </>
                  }
                  changeLabel={cs.colors.changeLabel(i + 1, yarn.name)}
                  custom={cluster.yarn !== cluster.autoYarn}
                  onChange={() => setEditing(i)}
                  onRestore={() => onYarnChange(i, null)}
                />
              )
            })}
            {fill && fillYarn && (
              <YarnRow
                yarn={fillYarn}
                sourceColor={null}
                details={
                  <>
                    {cs.colors.fill} · {fillYarn.code}
                  </>
                }
                changeLabel={cs.colors.fillChangeLabel(fillYarn.name)}
                custom={fill.yarn !== fill.autoYarn}
                onChange={() => setEditing('fill')}
                onRestore={() => onBackgroundYarnChange(null)}
              />
            )}
          </ul>

          <div className="text-muted mt-3 flex flex-col gap-1 text-sm">
            {clusters.length < colorCount && <p>{cs.colors.fewerThanRequested(clusters.length)}</p>}
            {distinctYarns < clusters.length && <p>{cs.colors.merged}</p>}
            {dropped.length > 0 && <p>{cs.colors.dropped(dropped)}</p>}
            {result.smoothedPixels > 0 && (
              <p>
                {cs.colors.smoothed(
                  limitsConfig.minLineWidthMm,
                  limitsConfig.minDetailMm,
                  result.layout.widthMm,
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {picker && (
        <YarnPicker
          yarns={yarns}
          sourceColor={picker.sourceColor}
          currentCode={picker.current}
          recommendedCode={picker.recommended}
          onSelect={(code) => {
            picker.select(code)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </Panel>
  )
}
