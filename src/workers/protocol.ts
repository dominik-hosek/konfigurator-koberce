// Typed messages between the UI thread and the processing worker.
import type { Rgb } from '../lib/color/convert'

export type ProcessingStage = 'histogram' | 'clustering' | 'rendering'

export type WorkerRequest =
  | {
      type: 'setImage'
      imageId: number
      width: number
      height: number
      pixels: Uint8ClampedArray
    }
  | {
      type: 'quantize'
      requestId: number
      imageId: number
      colorCount: number
    }

export interface QuantizeResult {
  imageId: number
  colorCount: number
  width: number
  height: number
  /** Palette sorted by area, largest first. */
  palette: Rgb[]
  /** Pixel count per palette entry. */
  counts: number[]
  /** Palette index per pixel; TRANSPARENT_INDEX marks background. */
  indices: Uint8Array
  /** Flat preview as RGBA, ready for putImageData. */
  preview: Uint8ClampedArray
}

export type WorkerResponse =
  | { type: 'progress'; requestId: number; stage: ProcessingStage; fraction: number }
  | { type: 'quantized'; requestId: number; result: QuantizeResult }
  | { type: 'error'; requestId: number; message: string }
