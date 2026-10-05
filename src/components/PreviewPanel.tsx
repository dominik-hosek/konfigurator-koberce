import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { ProcessorState } from '../hooks/useProcessor'
import { drawRgba } from '../render/flat'
import type { SourceImage } from '../state/configurator'
import { cs } from '../strings/cs'
import { ProgressBar } from './ui/ProgressBar'
import { SegmentedControl } from './ui/SegmentedControl'

type View = 'design' | 'original'

interface PreviewPanelProps {
  image: SourceImage
  processor: ProcessorState
  /** When true, a click on the preview reports the image pixel under the pointer. */
  picking: boolean
  onPick: (x: number, y: number) => void
  onCancelPick: () => void
}

export function PreviewPanel({
  image,
  processor,
  picking,
  onPick,
  onCancelPick,
}: PreviewPanelProps) {
  const [view, setView] = useState<View>('design')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { result, status, stage, progress } = processor
  // Only show results that belong to the current image.
  const current = result?.imageId === image.id ? result : null
  const { width, height } = image.imageData

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (view === 'original') drawRgba(canvas, image.imageData.data, width, height)
    else if (current) drawRgba(canvas, current.preview, current.width, current.height)
  }, [view, image, current, width, height])

  useEffect(() => {
    if (!picking) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancelPick()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picking, onCancelPick])

  function handlePick(e: MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * width
    const y = ((e.clientY - rect.top) / rect.height) * height
    onPick(Math.min(width - 1, Math.max(0, x)), Math.min(height - 1, Math.max(0, y)))
  }

  const working = status === 'working'
  const showCanvas = view === 'original' || current !== null

  return (
    <section aria-labelledby="preview-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="preview-title" className="text-base font-semibold">
          {cs.preview.title}
        </h2>
        <SegmentedControl
          label={cs.preview.viewLabel}
          value={view}
          onChange={setView}
          options={[
            { value: 'design', label: cs.preview.design },
            { value: 'original', label: cs.preview.original },
          ]}
        />
      </div>

      <div
        className={`border-line relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border bg-stone-100 p-4 sm:p-8 ${
          picking ? 'ring-2 ring-stone-800' : ''
        }`}
      >
        {/* Mouse/touch picking; keyboard users have "Najít pozadí automaticky" instead. */}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={
            picking
              ? cs.preview.pickLabel
              : view === 'original'
                ? cs.preview.originalLabel
                : cs.preview.canvasLabel
          }
          onClick={picking ? handlePick : undefined}
          className={`checker h-auto max-h-[70dvh] w-auto max-w-full shadow-sm ${
            picking ? 'cursor-crosshair' : ''
          } ${showCanvas ? '' : 'hidden'}`}
          style={{ aspectRatio: `${width} / ${height}` }}
        />
        {!showCanvas && <p className="text-muted text-sm">{cs.preview.working}</p>}

        {working && (
          <div className="absolute inset-x-0 top-0">
            <ProgressBar value={progress} label={cs.preview.progressLabel} />
          </div>
        )}
      </div>

      <div aria-live="polite" className="min-h-5 text-sm">
        {working && (
          <p className="text-muted">{stage ? cs.preview.stages[stage] : cs.preview.working}</p>
        )}
        {status === 'error' && (
          <p role="alert" className="text-red-700">
            {cs.preview.error}
          </p>
        )}
      </div>
    </section>
  )
}
