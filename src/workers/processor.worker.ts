// Processing worker: owns the working copy of the image and runs every per-pixel stage,
// so the UI thread stays responsive. Intermediate results are cached, so changing a later
// setting (yarn override, size) does not recompute earlier stages (background, clustering).
import { limitsConfig, yarnConfig } from '../config'
import {
  buildHistogram,
  indexPixels,
  quantizeHistogram,
  TRANSPARENT_INDEX,
  type ColorHistogram,
  type Quantization,
} from '../lib/color/quantize'
import type { Rgb } from '../lib/color/convert'
import { assignYarns, nearestYarn, prepareYarns } from '../lib/color/yarns'
import { detailRadiusPx } from '../lib/geometry/dimensions'
import { computeLayout, rugAreaM2 } from '../lib/geometry/layout'
import { computeBackgroundMask, type ResolvedBackgroundMode } from '../lib/image/background'
import { composeRug, CUT } from '../lib/image/compose'
import { buildYarnLayer, summarizeLabels } from '../lib/image/design'
import { indexedToRgba } from '../lib/image/indexed'
import { measureMotif } from '../lib/image/motif'
import { smoothDetailsSteps } from '../lib/image/smoothing'
import type { ProcessingStage, ProcessSettings, WorkerRequest, WorkerResponse } from './protocol'

// The app tsconfig uses DOM typings; describe the bits of the worker scope we use.
interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void
}
const scope = self as unknown as WorkerScope

const yarns = prepareYarns(yarnConfig.yarns)
const yarnByCode = new Map(yarns.map((y) => [y.code, y]))

type ProcessRequest = Extract<WorkerRequest, { type: 'process' }>

interface ImageState {
  id: number
  width: number
  height: number
  pixels: Uint8ClampedArray
  // Cache, invalidated from the top down.
  backgroundKey?: string
  mask?: Uint8Array
  backgroundMode?: ResolvedBackgroundMode
  histogram?: ColorHistogram
  quantizations: Map<number, Quantization>
  clusterIndices?: { colorCount: number; indices: Uint8Array }
}

let image: ImageState | null = null
let pending: ProcessRequest | null = null
let running = false

class Superseded extends Error {}

function post(message: WorkerResponse, transfer?: Transferable[]) {
  scope.postMessage(message, transfer)
}

function progress(requestId: number, stage: ProcessingStage) {
  // Throttle: posting thousands of messages would itself slow the UI down.
  let last = -1
  return (fraction: number) => {
    if (fraction === 1 || fraction - last >= 0.02) {
      last = fraction
      post({ type: 'progress', requestId, stage, fraction })
    }
  }
}

/** Lets queued messages arrive; aborts if a newer request is waiting. */
async function checkpoint() {
  await new Promise((resolve) => setTimeout(resolve, 0))
  if (pending) throw new Superseded()
}

async function run(req: ProcessRequest) {
  if (!image || image.id !== req.imageId) {
    post({ type: 'error', requestId: req.requestId, message: 'image-not-loaded' })
    return
  }
  const img = image
  const s: ProcessSettings = req.settings
  const report = (stage: ProcessingStage) => progress(req.requestId, stage)

  // 1. Background mask.
  const backgroundKey = JSON.stringify(s.background)
  if (img.backgroundKey !== backgroundKey) {
    report('background')(0)
    const { mask, mode } = computeBackgroundMask(img.pixels, img.width, img.height, s.background)
    Object.assign(img, {
      backgroundKey,
      mask,
      backgroundMode: mode,
      histogram: undefined,
      clusterIndices: undefined,
    })
    img.quantizations.clear()
    await checkpoint()
  }

  // 2. Colour clustering.
  img.histogram ??= buildHistogram(img.pixels, img.mask, report('histogram'))
  let q = img.quantizations.get(s.colorCount)
  if (!q) {
    q = quantizeHistogram(img.histogram, s.colorCount, report('clustering'))
    img.quantizations.set(s.colorCount, q)
    await checkpoint()
  }
  if (img.clusterIndices?.colorCount !== s.colorCount) {
    img.clusterIndices = {
      colorCount: s.colorCount,
      indices: indexPixels(img.pixels, img.histogram, q, img.mask),
    }
  }

  // 3. Yarn mapping.
  const assignment = assignYarns(q.palette, yarns, s.yarnOverrides)
  const layer = buildYarnLayer(img.clusterIndices.indices, assignment.final)
  let backgroundCount = 0
  for (const l of layer.labels) if (l === TRANSPARENT_INDEX) backgroundCount++

  // 4. Layout and rug composition (background fill inside, cut outside the shape).
  const motif = measureMotif(layer.labels, img.width, img.height)
  const layout = computeLayout(motif, s.shape, limitsConfig.size)
  const fillSource: Rgb = s.background.mode === 'color' ? s.background.colors[0]! : [255, 255, 255]
  const autoFill = nearestYarn(fillSource, yarns).code
  const fillYarn =
    s.backgroundYarn && yarnByCode.has(s.backgroundYarn) ? s.backgroundYarn : autoFill
  let fillLabel = layer.codes.indexOf(fillYarn)
  if (fillLabel === -1) fillLabel = layer.codes.push(fillYarn) - 1
  const rug = composeRug(layer.labels, img.width, img.height, layout, fillLabel)

  // 5. Detail smoothing on the final grid, yielding so newer requests can cancel it.
  const smoothingProgress = report('smoothing')
  const radius = detailRadiusPx(limitsConfig.minDetailMm, layout.pxPerMm)
  const steps = smoothDetailsSteps(rug.labels, rug.width, rug.height, radius, CUT)
  let step = steps.next()
  while (!step.done) {
    smoothingProgress(step.value)
    await checkpoint()
    step = steps.next()
  }
  const smoothed = step.value

  // 6. Final design + flat preview.
  report('rendering')(0)
  const summary = summarizeLabels(smoothed.labels, layer.codes)
  const preview = indexedToRgba(
    summary.indices,
    summary.yarns.map((y) => yarnByCode.get(y.code)!.rgb),
  )

  post(
    {
      type: 'processed',
      requestId: req.requestId,
      result: {
        imageId: img.id,
        settings: s,
        width: rug.width,
        height: rug.height,
        layout,
        motif,
        areaM2: rugAreaM2(layout, rug.rugPixels),
        boundingAreaM2: (layout.widthMm * layout.heightMm) / 1_000_000,
        fill: {
          autoYarn: autoFill,
          yarn: fillYarn,
          sourceColor: fillSource,
          used: rug.fillPixels > 0,
        },
        backgroundMode: img.backgroundMode ?? 'none',
        clusters: q.palette.map((color, i) => ({
          color,
          count: q.counts[i]!,
          autoYarn: assignment.auto[i]!,
          yarn: assignment.final[i]!,
        })),
        yarns: summary.yarns,
        backgroundCount,
        indices: summary.indices,
        preview,
        smoothedPixels: smoothed.changed,
      },
    },
    [summary.indices.buffer, preview.buffer],
  )
}

// Requests are coalesced: while the user drags a slider only the latest one runs, and a
// running one is abandoned at the next checkpoint when a newer one arrives.
async function drain() {
  if (running) return
  running = true
  while (pending) {
    const req = pending
    pending = null
    try {
      await run(req)
    } catch (err) {
      if (err instanceof Superseded) continue
      post({
        type: 'error',
        requestId: req.requestId,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
  running = false
}

scope.onmessage = (event) => {
  const msg = event.data
  switch (msg.type) {
    case 'setImage':
      image = {
        id: msg.imageId,
        width: msg.width,
        height: msg.height,
        pixels: msg.pixels,
        quantizations: new Map(),
      }
      break
    case 'process':
      pending = msg
      void drain()
      break
  }
}
