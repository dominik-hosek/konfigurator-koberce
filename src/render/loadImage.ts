// Decodes an uploaded file and downscales it for processing. Runs on the UI thread because it
// relies on the browser's image decoder; the heavy per-pixel work happens in the worker.
import { fitWithin } from '../lib/image/upload'

export interface LoadedImage {
  imageData: ImageData
  originalWidth: number
  originalHeight: number
}

function decode(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  return img
    .decode()
    .then(() => img)
    .finally(() => URL.revokeObjectURL(url))
}

function canvas2d(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D is not available')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return { canvas, ctx }
}

export async function loadImage(file: Blob, maxPx: number): Promise<LoadedImage> {
  const img = await decode(file)
  const originalWidth = img.naturalWidth
  const originalHeight = img.naturalHeight
  const target = fitWithin(originalWidth, originalHeight, maxPx)

  // Halve in steps first: a single large drawImage downscale aliases badly in some browsers.
  let source: CanvasImageSource = img
  let w = originalWidth
  let h = originalHeight
  while (w / 2 >= target.width * 1.5 && h / 2 >= target.height * 1.5) {
    w = Math.round(w / 2)
    h = Math.round(h / 2)
    const step = canvas2d(w, h)
    step.ctx.drawImage(source, 0, 0, w, h)
    source = step.canvas
  }

  const { ctx } = canvas2d(target.width, target.height)
  ctx.drawImage(source, 0, 0, target.width, target.height)
  return {
    imageData: ctx.getImageData(0, 0, target.width, target.height),
    originalWidth,
    originalHeight,
  }
}
