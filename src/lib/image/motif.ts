// Measures where the motif (non-background pixels) sits in the image.
import { TRANSPARENT_INDEX } from '../color/quantize'
import type { MotifMetrics } from '../geometry/layout'

export function measureMotif(labels: Uint8Array, width: number, height: number): MotifMetrics {
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  let background = 0
  for (let y = 0, p = 0; y < height; y++) {
    for (let x = 0; x < width; x++, p++) {
      if (labels[p] === TRANSPARENT_INDEX) {
        background++
        continue
      }
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }

  // No motif at all (everything removed): treat the whole image as the motif.
  if (x1 < 0) {
    return {
      imageWidth: width,
      imageHeight: height,
      hasBackground: false,
      bbox: { x0: 0, y0: 0, x1: width, y1: height },
      ellipseScale: Math.SQRT2,
      circleRadius: Math.hypot(width, height) / 2,
    }
  }

  const bbox = { x0, y0, x1: x1 + 1, y1: y1 + 1 }
  const cx = (bbox.x0 + bbox.x1) / 2
  const cy = (bbox.y0 + bbox.y1) / 2
  const a = (bbox.x1 - bbox.x0) / 2
  const b = (bbox.y1 - bbox.y0) / 2

  // Use the pixel corner furthest from the centre so whole pixels end up inside.
  let maxE = 0
  let maxR2 = 0
  for (let y = y0, row = y0 * width; y <= y1; y++, row += width) {
    const dy = Math.abs(y + 0.5 - cy) + 0.5
    for (let x = x0; x <= x1; x++) {
      if (labels[row + x] === TRANSPARENT_INDEX) continue
      const dx = Math.abs(x + 0.5 - cx) + 0.5
      const e = (dx / a) ** 2 + (dy / b) ** 2
      if (e > maxE) maxE = e
      const r2 = dx * dx + dy * dy
      if (r2 > maxR2) maxR2 = r2
    }
  }

  return {
    imageWidth: width,
    imageHeight: height,
    hasBackground: background > 0,
    bbox,
    ellipseScale: Math.sqrt(maxE),
    circleRadius: Math.sqrt(maxR2),
  }
}
