function bufferCanvas(pixels: Uint8ClampedArray, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  // Copy into a fresh ArrayBuffer-backed array: ImageData rejects views on shared/other buffers.
  canvas
    .getContext('2d')
    ?.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0)
  return canvas
}

/** Draws a finished RGBA buffer onto a canvas, resizing the canvas to fit it. */
export function drawRgba(
  canvas: HTMLCanvasElement,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0)
}

/**
 * Draws a buffer downscaled to `targetWidth` × `targetHeight` device pixels. Halving in steps
 * averages neighbouring pixels, so fine regular textures (tuft rows) don't turn into moiré
 * the way they do when the browser shrinks a large canvas with CSS.
 */
export function drawRgbaScaled(
  canvas: HTMLCanvasElement,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
): void {
  if (targetWidth >= width || targetHeight >= height) {
    drawRgba(canvas, pixels, width, height)
    return
  }
  let source = bufferCanvas(pixels, width, height)
  let w = width
  let h = height
  while (w / 2 >= targetWidth && h / 2 >= targetHeight) {
    w = Math.round(w / 2)
    h = Math.round(h / 2)
    const step = document.createElement('canvas')
    step.width = w
    step.height = h
    const ctx = step.getContext('2d')
    if (!ctx) break
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, w, h)
    source = step
  }
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight)
}
