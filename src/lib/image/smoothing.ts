// Detail smoothing: removes islands and lines that are too small to be tufted.
//
// Each label (yarn or background) is morphologically opened with a disk of the given radius:
// a pixel keeps its label only if a disk of that radius fits inside the label's region and
// covers the pixel. Everything else (thin lines, small islands, sharp spikes) is reassigned
// to the label of the nearest surviving pixel. The image border does not erode regions, so
// full-bleed designs keep their square corners.
//
// An optional `ignoreLabel` (pixels outside the rug) is left untouched: it is never opened,
// never erodes neighbouring regions (like the image border) and never spreads into the rug.
// Otherwise the thin slivers between a circle and its bounding box would be "smoothed away"
// and flatten the outline.
import { distanceTransform } from './edt'

export interface SmoothingResult {
  labels: Uint8Array
  /** Number of pixels whose label changed. */
  changed: number
}

interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

function labelBoxes(labels: Uint8Array, width: number, ignore: number): Map<number, Box> {
  const boxes = new Map<number, Box>()
  for (let p = 0; p < labels.length; p++) {
    const l = labels[p]!
    if (l === ignore) continue
    const x = p % width
    const y = (p - x) / width
    const b = boxes.get(l)
    if (!b) boxes.set(l, { x0: x, y0: y, x1: x, y1: y })
    else {
      if (x < b.x0) b.x0 = x
      if (x > b.x1) b.x1 = x
      if (y < b.y0) b.y0 = y
      if (y > b.y1) b.y1 = y
    }
  }
  return boxes
}

/**
 * Generator form so the worker can yield between labels (to stay cancellable).
 * Yields progress 0..1 and returns the result.
 */
export function* smoothDetailsSteps(
  labels: Uint8Array,
  width: number,
  height: number,
  radius: number,
  ignoreLabel = -1,
): Generator<number, SmoothingResult> {
  if (radius < 0.5 || labels.length === 0) return { labels: labels.slice(), changed: 0 }

  const r2 = radius * radius
  const margin = Math.ceil(radius) + 1
  const kept = new Uint8Array(labels.length)
  const boxes = labelBoxes(labels, width, ignoreLabel)
  let done = 0
  // Final nearest-label pass counts as one more step.
  const steps = boxes.size + 1

  for (const [label, box] of boxes) {
    // Work inside the label's bounding box plus a margin: much cheaper for small regions.
    const bx0 = Math.max(0, box.x0 - margin)
    const by0 = Math.max(0, box.y0 - margin)
    const bw = Math.min(width - 1, box.x1 + margin) - bx0 + 1
    const bh = Math.min(height - 1, box.y1 + margin) - by0 + 1
    const n = bw * bh

    // Erosion: keep pixels further than r from any other label.
    const other = new Uint8Array(n)
    const own = new Uint8Array(n)
    for (let y = 0, p = 0; y < bh; y++) {
      const row = (by0 + y) * width + bx0
      for (let x = 0; x < bw; x++, p++) {
        const l = labels[row + x]
        own[p] = l === label ? 1 : 0
        other[p] = l !== label && l !== ignoreLabel ? 1 : 0
      }
    }
    const outside = distanceTransform(bw, bh, other)
    const eroded = new Uint8Array(n)
    for (let p = 0; p < n; p++) eroded[p] = own[p] && outside.dist2[p]! > r2 ? 1 : 0

    // Dilation of the eroded set by r.
    const inside = distanceTransform(bw, bh, eroded)
    for (let y = 0, p = 0; y < bh; y++) {
      const row = (by0 + y) * width + bx0
      for (let x = 0; x < bw; x++, p++) {
        if (own[p] && inside.dist2[p]! <= r2) kept[row + x] = 1
      }
    }
    yield ++done / steps
  }

  const nearest = distanceTransform(width, height, kept, true)
  const out = labels.slice()
  let changed = 0
  if (boxes.size > 0 && kept.includes(1)) {
    for (let p = 0; p < out.length; p++) {
      if (kept[p] || labels[p] === ignoreLabel) continue
      const l = labels[nearest.nearest![p]!]!
      if (l !== out[p]) {
        out[p] = l
        changed++
      }
    }
  }
  yield 1
  return { labels: out, changed }
}

export function smoothDetails(
  labels: Uint8Array,
  width: number,
  height: number,
  radius: number,
  ignoreLabel = -1,
): SmoothingResult {
  const it = smoothDetailsSteps(labels, width, height, radius, ignoreLabel)
  for (;;) {
    const step = it.next()
    if (step.done) return step.value
  }
}
