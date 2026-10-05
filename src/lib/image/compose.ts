// Composes the final rug grid: motif labels placed in the layout frame, background inside the
// rug filled with a yarn label, everything outside the rug shape cut away.
import { TRANSPARENT_INDEX } from '../color/quantize'
import type { RugLayout } from '../geometry/layout'
import { distanceTransform } from './edt'

/** Label for pixels outside the rug (same value as the transparent background index). */
export const CUT = TRANSPARENT_INDEX

export interface ComposedRug {
  labels: Uint8Array
  width: number
  height: number
  /** Pixels that belong to the rug. */
  rugPixels: number
  /** Rug pixels filled with the background yarn. */
  fillPixels: number
}

/** Marks pixels inside the shape outline (1) of a width × height grid. */
function shapeMask(
  layout: RugLayout,
  motif: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const mask = new Uint8Array(width * height)
  switch (layout.shape) {
    case 'rectangle':
      return mask.fill(1)

    case 'circle':
    case 'oval': {
      const a = width / 2
      const b = height / 2
      for (let y = 0, p = 0; y < height; y++) {
        const dy = (y + 0.5 - b) / b
        for (let x = 0; x < width; x++, p++) {
          const dx = (x + 0.5 - a) / a
          mask[p] = dx * dx + dy * dy <= 1 ? 1 : 0
        }
      }
      return mask
    }

    case 'contour': {
      // Motif dilated by the margin, with enclosed holes filled.
      const margin = layout.marginMm * layout.pxPerMm
      const { dist2 } = distanceTransform(width, height, motif)
      const limit = Math.max(0.5, margin) ** 2
      for (let p = 0; p < mask.length; p++) mask[p] = dist2[p]! <= limit ? 1 : 0
      fillHoles(mask, width, height)
      return mask
    }
  }
}

/** Sets enclosed 0-regions (not connected to the grid border) to 1. */
export function fillHoles(mask: Uint8Array, width: number, height: number): void {
  const outside = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  let head = 0
  let tail = 0
  const push = (p: number) => {
    if (!mask[p] && !outside[p]) {
      outside[p] = 1
      queue[tail++] = p
    }
  }
  for (let x = 0; x < width; x++) {
    push(x)
    push((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    push(y * width)
    push(y * width + width - 1)
  }
  while (head < tail) {
    const p = queue[head++]!
    const x = p % width
    if (x > 0) push(p - 1)
    if (x < width - 1) push(p + 1)
    if (p >= width) push(p - width)
    if (p < mask.length - width) push(p + width)
  }
  for (let p = 0; p < mask.length; p++) if (!mask[p] && !outside[p]) mask[p] = 1
}

export function composeRug(
  labels: Uint8Array,
  imageWidth: number,
  imageHeight: number,
  layout: RugLayout,
  fillLabel: number,
): ComposedRug {
  const { x: fx, y: fy, width, height } = layout.frame
  const out = new Uint8Array(width * height)
  const motif = new Uint8Array(width * height)

  for (let y = 0, p = 0; y < height; y++) {
    const sy = fy + y
    const inRow = sy >= 0 && sy < imageHeight
    for (let x = 0; x < width; x++, p++) {
      const sx = fx + x
      const l = inRow && sx >= 0 && sx < imageWidth ? labels[sy * imageWidth + sx]! : CUT
      out[p] = l
      motif[p] = l === CUT ? 0 : 1
    }
  }

  const mask = shapeMask(layout, motif, width, height)
  let rugPixels = 0
  let fillPixels = 0
  for (let p = 0; p < out.length; p++) {
    if (!mask[p]) {
      out[p] = CUT
      continue
    }
    rugPixels++
    if (out[p] === CUT) {
      out[p] = fillLabel
      fillPixels++
    }
  }
  return { labels: out, width, height, rugPixels, fillPixels }
}
