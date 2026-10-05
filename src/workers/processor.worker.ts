// Processing worker: owns the working copy of the image and runs every per-pixel stage,
// so the UI thread stays responsive. Results of earlier stages are cached per image.
import {
  buildHistogram,
  indexPixels,
  quantizeHistogram,
  type ColorHistogram,
  type Quantization,
} from '../lib/color/quantize'
import { indexedToRgba } from '../lib/image/indexed'
import type { ProcessingStage, WorkerRequest, WorkerResponse } from './protocol'

// The app tsconfig uses DOM typings; describe the bits of the worker scope we use.
interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void
}
const scope = self as unknown as WorkerScope

interface ImageState {
  id: number
  width: number
  height: number
  pixels: Uint8ClampedArray
  histogram?: ColorHistogram
  quantizations: Map<number, Quantization>
}

let image: ImageState | null = null
let pendingQuantize: Extract<WorkerRequest, { type: 'quantize' }> | null = null
let scheduled = false

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

function runQuantize(req: Extract<WorkerRequest, { type: 'quantize' }>) {
  if (!image || image.id !== req.imageId) {
    post({ type: 'error', requestId: req.requestId, message: 'image-not-loaded' })
    return
  }
  const img = image
  img.histogram ??= buildHistogram(img.pixels, undefined, progress(req.requestId, 'histogram'))

  let q = img.quantizations.get(req.colorCount)
  if (!q) {
    q = quantizeHistogram(img.histogram, req.colorCount, progress(req.requestId, 'clustering'))
    img.quantizations.set(req.colorCount, q)
  }

  post({ type: 'progress', requestId: req.requestId, stage: 'rendering', fraction: 0 })
  const indices = indexPixels(img.pixels, img.histogram, q)
  const preview = indexedToRgba(indices, q.palette)

  post(
    {
      type: 'quantized',
      requestId: req.requestId,
      result: {
        imageId: img.id,
        colorCount: req.colorCount,
        width: img.width,
        height: img.height,
        palette: q.palette,
        counts: q.counts,
        indices,
        preview,
      },
    },
    [indices.buffer, preview.buffer],
  )
}

// Quantize requests are coalesced: while the user drags a slider only the latest one runs.
function flush() {
  scheduled = false
  const req = pendingQuantize
  pendingQuantize = null
  if (!req) return
  try {
    runQuantize(req)
  } catch (err) {
    post({
      type: 'error',
      requestId: req.requestId,
      message: err instanceof Error ? err.message : String(err),
    })
  }
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
      pendingQuantize = null
      break
    case 'quantize':
      pendingQuantize = msg
      if (!scheduled) {
        scheduled = true
        setTimeout(flush, 0)
      }
      break
  }
}
