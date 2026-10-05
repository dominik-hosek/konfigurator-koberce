// Detail smoothing: removes what is too small to be tufted, in two passes.
//
// 1. Thin lines: each label (yarn or background) is morphologically opened with a disk of
//    `lineRadius`: a pixel keeps its label only if a disk of that radius fits inside the
//    label's region and covers the pixel. Thinner lines and spikes are reassigned to the
//    label of the nearest surviving pixel. The image border does not erode regions, so
//    full-bleed designs keep their square corners.
// 2. Small islands: connected areas smaller than `minIslandArea` pixels are absorbed by the
//    label they share the longest border with.
//
// Keeping the two limits separate matters for portraits: an eyebrow or a mouth line is
// narrow but long, and can be tufted even if a dot of the same width could not.
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

export interface SmoothingOptions {
  /** Half the minimum line width, in pixels. Below 0.5 the line pass is skipped. */
  lineRadius: number
  /** Minimum area of a connected region, in pixels. Below 2 the island pass is skipped. */
  minIslandArea: number
  /** Label that is never changed and never spreads (pixels outside the rug). */
  ignoreLabel?: number
}

/**
 * Absorbs connected regions (8-connected) smaller than `minArea` into the neighbouring label
 * with the longest shared border. Smallest regions go first. Mutates `labels`.
 */
export function removeSmallIslands(
  labels: Uint8Array,
  width: number,
  height: number,
  minArea: number,
  ignoreLabel = -1,
): number {
  const n = labels.length
  const comp = new Int32Array(n).fill(-1)
  const order = new Int32Array(n) // pixels grouped by component
  const starts: number[] = []
  const areas: number[] = []
  let tail = 0

  for (let seed = 0; seed < n; seed++) {
    if (comp[seed] !== -1 || labels[seed] === ignoreLabel) continue
    const id = starts.length
    const label = labels[seed]
    starts.push(tail)
    comp[seed] = id
    order[tail++] = seed
    for (let head = starts[id]!; head < tail; head++) {
      const p = order[head]!
      const x = p % width
      const y = (p - x) / width
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= height) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= width) continue
          const q = yy * width + xx
          if (comp[q] === -1 && labels[q] === label) {
            comp[q] = id
            order[tail++] = q
          }
        }
      }
    }
    areas.push(tail - starts[id]!)
  }

  const small = areas
    .map((area, id) => ({ area, id }))
    .filter((c) => c.area < minArea)
    .sort((a, b) => a.area - b.area)

  let changed = 0
  const votes = new Map<number, number>()
  for (const { area, id } of small) {
    votes.clear()
    const start = starts[id]!
    const own = labels[order[start]!]!
    for (let i = start; i < start + area; i++) {
      const p = order[i]!
      const x = p % width
      const neighbours = [
        x > 0 ? p - 1 : -1,
        x < width - 1 ? p + 1 : -1,
        p >= width ? p - width : -1,
        p < n - width ? p + width : -1,
      ]
      for (const q of neighbours) {
        if (q < 0) continue
        const l = labels[q]!
        if (l === own || l === ignoreLabel) continue
        votes.set(l, (votes.get(l) ?? 0) + 1)
      }
    }
    let best = -1
    let bestVotes = 0
    for (const [l, v] of votes) {
      if (v > bestVotes) {
        best = l
        bestVotes = v
      }
    }
    if (best === -1) continue // only touches the outside: nothing to merge into
    for (let i = start; i < start + area; i++) labels[order[i]!] = best
    changed += area
  }
  return changed
}

/**
 * Generator form so the worker can yield between labels (to stay cancellable).
 * Yields progress 0..1 and returns the result.
 */
export function* smoothDetailsSteps(
  input: Uint8Array,
  width: number,
  height: number,
  options: SmoothingOptions,
): Generator<number, SmoothingResult> {
  const { lineRadius: radius, minIslandArea, ignoreLabel = -1 } = options
  const labels = input
  const countChanges = (out: Uint8Array) => {
    let changed = 0
    for (let p = 0; p < out.length; p++) if (out[p] !== input[p]) changed++
    return { labels: out, changed }
  }
  if (radius < 0.5) {
    const out = labels.slice()
    if (minIslandArea >= 2) removeSmallIslands(out, width, height, minIslandArea, ignoreLabel)
    yield 1
    return countChanges(out)
  }

  const r2 = radius * radius
  const margin = Math.ceil(radius) + 1
  const kept = new Uint8Array(labels.length)
  const boxes = labelBoxes(labels, width, ignoreLabel)
  let done = 0
  // The nearest-label pass and the island pass count as one more step each.
  const steps = boxes.size + 2

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
  if (boxes.size > 0 && kept.includes(1)) {
    for (let p = 0; p < out.length; p++) {
      if (kept[p] || labels[p] === ignoreLabel) continue
      out[p] = labels[nearest.nearest![p]!]!
    }
  }
  yield ++done / steps
  if (minIslandArea >= 2) removeSmallIslands(out, width, height, minIslandArea, ignoreLabel)
  yield 1
  return countChanges(out)
}

export function smoothDetails(
  labels: Uint8Array,
  width: number,
  height: number,
  options: SmoothingOptions,
): SmoothingResult {
  const it = smoothDetailsSteps(labels, width, height, options)
  for (;;) {
    const step = it.next()
    if (step.done) return step.value
  }
}
