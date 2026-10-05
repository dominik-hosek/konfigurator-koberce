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
  // Copy into a fresh ArrayBuffer-backed array: ImageData rejects views on shared/other buffers.
  ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0)
}
