import { useState } from 'react'
import { limitsConfig } from '../config'
import { rgbToHex } from '../lib/color/convert'
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
  widthMm: number
  onColorCountChange: (count: number) => void
  onYarnChange: (cluster: number, code: string | null) => void
}

export function ColorsPanel({
  step,
  colorCount,
  result,
  yarns,
  widthMm,
  onColorCountChange,
  onYarnChange,
}: ColorsPanelProps) {
  const [editing, setEditing] = useState<number | null>(null)
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
  const editingCluster = editing !== null ? clusters[editing] : undefined

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
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h3 className="text-sm font-medium">{cs.colors.paletteTitle}</h3>
          </div>
          <p className="mb-3 text-sm">{cs.colors.yarnSummary(result.yarns.length)}</p>

          <ul className="flex flex-col gap-2">
            {clusters.map((cluster, i) => {
              const yarn = byCode.get(cluster.yarn)
              if (!yarn || !finalYarns.has(cluster.yarn)) return null
              const custom = cluster.yarn !== cluster.autoYarn
              return (
                <li
                  key={i}
                  className="border-line flex items-center gap-3 rounded-xl border bg-white p-2 pr-3"
                >
                  <span
                    title={`${cs.colors.sourceColor}: ${rgbToHex(cluster.color)}`}
                    aria-hidden="true"
                    className="size-4 shrink-0 rounded-full ring-1 ring-black/10 ring-inset"
                    style={{ backgroundColor: rgbToHex(cluster.color) }}
                  />
                  <span
                    aria-hidden="true"
                    className="size-10 shrink-0 rounded-lg ring-1 ring-black/10 ring-inset"
                    style={{ backgroundColor: yarn.hex }}
                  />
                  <div className="min-w-0 flex-1 text-sm leading-tight">
                    <p className="truncate font-medium">{yarn.name}</p>
                    <p className="text-muted text-xs">
                      {yarn.code} · {cs.colors.share(total ? (cluster.count / total) * 100 : 0)}
                      {custom && <> · {cs.colors.custom}</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      type="button"
                      className={textButton}
                      aria-label={cs.colors.changeLabel(i + 1, yarn.name)}
                      onClick={() => setEditing(i)}
                    >
                      {cs.colors.change}
                    </button>
                    {custom && (
                      <button
                        type="button"
                        className={`${textButton} text-xs`}
                        onClick={() => onYarnChange(i, null)}
                      >
                        {cs.colors.restore}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="text-muted mt-3 flex flex-col gap-1 text-sm">
            {clusters.length < colorCount && <p>{cs.colors.fewerThanRequested(clusters.length)}</p>}
            {distinctYarns < clusters.length && <p>{cs.colors.merged}</p>}
            {dropped.length > 0 && <p>{cs.colors.dropped(dropped)}</p>}
            {result.smoothedPixels > 0 && (
              <p>{cs.colors.smoothed(limitsConfig.minDetailMm, widthMm)}</p>
            )}
          </div>
        </div>
      )}

      {editingCluster && editing !== null && (
        <YarnPicker
          yarns={yarns}
          sourceColor={editingCluster.color}
          currentCode={editingCluster.yarn}
          recommendedCode={editingCluster.autoYarn}
          onSelect={(code) => {
            onYarnChange(editing, code === editingCluster.autoYarn ? null : code)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </Panel>
  )
}
