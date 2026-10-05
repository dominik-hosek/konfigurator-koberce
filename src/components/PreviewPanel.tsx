import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { ProcessorState } from '../hooks/useProcessor'
import { drawRgba, drawRgbaScaled } from '../render/flat'
import type { SourceImage } from '../state/configurator'
import { cs } from '../strings/cs'
import { textButton } from './ui/buttonStyles'
import { ProgressBar } from './ui/ProgressBar'
import { SegmentedControl } from './ui/SegmentedControl'

type View = 'tufted' | 'flat' | 'original'

interface PreviewPanelProps {
  image: SourceImage
  processor: ProcessorState
  /** When true, a click on the preview reports the image pixel under the pointer. */
  picking: boolean
  onPick: (x: number, y: number) => void
  onCancelPick: () => void
}

interface Shown {
  pixels: Uint8ClampedArray
  width: number
  height: number
  /** Canvas pixels per source-image pixel, and the canvas origin in source-image pixels. */
  scale: number
  offsetX: number
  offsetY: number
  isDesign: boolean
}

export function PreviewPanel({
  image,
  processor,
  picking,
  onPick,
  onCancelPick,
}: PreviewPanelProps) {
  const [view, setView] = useState<View>('tufted')
  const [zoomed, setZoomed] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [frameWidth, setFrameWidth] = useState(0)

  // Track the space available for the preview, to draw it at display resolution.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setFrameWidth(entry.contentRect.width)
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])
  const { result, texture, textureProgress, status, stage, progress } = processor
  // Only show results that belong to the current image.
  const current = result?.imageId === image.id ? result : null
  const currentTexture = current && texture?.imageId === image.id ? texture : null

  let shown: Shown | null = null
  if (view === 'original' || !current) {
    if (view === 'original') {
      const { data, width, height } = image.imageData
      shown = { pixels: data, width, height, scale: 1, offsetX: 0, offsetY: 0, isDesign: false }
    }
  } else {
    const { x, y } = current.layout.frame
    // The tufted look follows the flat result; show the flat one until it arrives.
    shown =
      view === 'tufted' && currentTexture
        ? { ...currentTexture, offsetX: x, offsetY: y, isDesign: true }
        : {
            pixels: current.preview,
            width: current.width,
            height: current.height,
            scale: 1,
            offsetX: x,
            offsetY: y,
            isDesign: true,
          }
  }

  // Redraw only when the buffer itself changes; `shown` is a fresh object on every render.
  const pixels = shown?.pixels
  const shownWidth = shown?.width
  const shownHeight = shown?.height
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pixels || !shownWidth || !shownHeight) return
    if (zoomed || frameWidth === 0) {
      drawRgba(canvas, pixels, shownWidth, shownHeight)
      return
    }
    const dpr = window.devicePixelRatio || 1
    const fit = Math.min(1, frameWidth / shownWidth, (window.innerHeight * 0.7) / shownHeight)
    drawRgbaScaled(
      canvas,
      pixels,
      shownWidth,
      shownHeight,
      Math.max(1, Math.round(shownWidth * fit * dpr)),
      Math.max(1, Math.round(shownHeight * fit * dpr)),
    )
  }, [pixels, shownWidth, shownHeight, zoomed, frameWidth])

  // When zooming in, start in the middle of the rug rather than its top-left corner.
  useEffect(() => {
    const frame = frameRef.current
    if (!zoomed || !frame) return
    frame.scrollLeft = (frame.scrollWidth - frame.clientWidth) / 2
    frame.scrollTop = (frame.scrollHeight - frame.clientHeight) / 2
  }, [zoomed, pixels])

  useEffect(() => {
    if (!picking) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancelPick()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picking, onCancelPick])

  function handlePick(e: MouseEvent<HTMLCanvasElement>) {
    if (!shown) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (((e.clientX - rect.left) / rect.width) * shown.width) / shown.scale + shown.offsetX
    const y = (((e.clientY - rect.top) / rect.height) * shown.height) / shown.scale + shown.offsetY
    const { width: iw, height: ih } = image.imageData
    onPick(Math.min(iw - 1, Math.max(0, x)), Math.min(ih - 1, Math.max(0, y)))
  }

  const working = status === 'working'
  const texturing = view === 'tufted' && current !== null && textureProgress !== null
  const canZoom = shown !== null && !picking

  return (
    <section aria-labelledby="preview-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="preview-title" className="text-base font-semibold">
          {cs.preview.title}
        </h2>
        <SegmentedControl
          label={cs.preview.viewLabel}
          value={view}
          onChange={setView}
          options={[
            { value: 'tufted', label: cs.preview.tufted },
            { value: 'flat', label: cs.preview.flat },
            { value: 'original', label: cs.preview.original },
          ]}
        />
      </div>

      <div
        className={`border-line relative overflow-hidden rounded-2xl border bg-stone-100 ${
          picking ? 'ring-2 ring-stone-800' : ''
        }`}
      >
        <div
          ref={frameRef}
          className={
            zoomed && canZoom
              ? 'max-h-[70dvh] overflow-auto p-4'
              : 'flex min-h-64 items-center justify-center p-4 sm:p-8'
          }
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
                  : view === 'tufted'
                    ? cs.preview.tuftedLabel
                    : cs.preview.canvasLabel
            }
            onClick={picking ? handlePick : undefined}
            className={`${
              zoomed && canZoom ? 'max-w-none' : 'h-auto max-h-[70dvh] w-auto max-w-full'
            } ${shown?.isDesign ? 'drop-shadow-md' : 'checker shadow-sm'} ${
              picking ? 'cursor-crosshair' : ''
            } ${shown ? '' : 'hidden'}`}
            style={shown ? { aspectRatio: `${shown.width} / ${shown.height}` } : undefined}
          />
          {!shown && <p className="text-muted text-sm">{cs.preview.working}</p>}
        </div>

        {(working || texturing) && (
          <div className="absolute inset-x-0 top-0">
            <ProgressBar
              value={working ? progress : (textureProgress ?? 0)}
              label={working ? cs.preview.progressLabel : cs.preview.textureProgressLabel}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <div aria-live="polite" className="min-h-5">
          {working && (
            <p className="text-muted">{stage ? cs.preview.stages[stage] : cs.preview.working}</p>
          )}
          {!working && texturing && <p className="text-muted">{cs.preview.stages.texture}</p>}
          {status === 'error' && (
            <p role="alert" className="text-red-700">
              {cs.preview.error}
            </p>
          )}
        </div>
        {canZoom && (
          <button
            type="button"
            className={textButton}
            aria-pressed={zoomed}
            onClick={() => setZoomed((z) => !z)}
          >
            {zoomed ? cs.preview.zoomOut : cs.preview.zoomIn}
          </button>
        )}
      </div>
      {view === 'tufted' && <p className="text-muted -mt-2 text-xs">{cs.preview.tuftedNote}</p>}
    </section>
  )
}
