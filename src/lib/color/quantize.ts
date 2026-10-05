// Image colour quantization: RGBA pixels -> small palette + one palette index per pixel.
//
// Stage 1 (per image, cached): build a colour histogram with 5 bits per channel. Each
//   occupied bin stores the mean colour of its pixels, so precision loss is small.
// Stage 2 (per colour count): weighted k-means in CIELAB over the occupied bins.
// Stage 3: map every pixel through its bin to a cluster index.
import { labToRgb, rgbToLabInto, type Rgb } from './convert'
import { kmeans } from './kmeans'

/** Palette index used for pixels that are not part of the rug (transparent background). */
export const TRANSPARENT_INDEX = 255

/** Pixels with alpha below this are treated as background. */
export const ALPHA_THRESHOLD = 128

const BITS = 5
const SHIFT = 8 - BITS
const BIN_COUNT = 1 << (BITS * 3)

function binOf(r: number, g: number, b: number): number {
  return ((r >> SHIFT) << (BITS * 2)) | ((g >> SHIFT) << BITS) | (b >> SHIFT)
}

export interface ColorHistogram {
  /** Lab colour per occupied bin, flat [L, a, b, ...]. */
  points: Float32Array
  /** Pixel count per occupied bin. */
  weights: Uint32Array
  /** Bin id -> point index, or -1 for empty bins. */
  binToPoint: Int32Array
  /** Number of opaque (foreground) pixels. */
  opaquePixels: number
}

/**
 * Builds a colour histogram of the opaque pixels. `mask`, if given, marks pixels that
 * should be ignored (non-zero = background) in addition to transparent ones.
 */
export function buildHistogram(
  pixels: Uint8ClampedArray,
  mask?: Uint8Array,
  onProgress?: (fraction: number) => void,
): ColorHistogram {
  const pixelCount = pixels.length / 4
  const counts = new Uint32Array(BIN_COUNT)
  const sums = new Float64Array(BIN_COUNT * 3)
  let opaquePixels = 0
  const progressStep = Math.max(1, Math.floor(pixelCount / 10))

  for (let p = 0; p < pixelCount; p++) {
    const i = p * 4
    if (pixels[i + 3]! < ALPHA_THRESHOLD || (mask && mask[p])) continue
    const r = pixels[i]!
    const g = pixels[i + 1]!
    const b = pixels[i + 2]!
    const bin = binOf(r, g, b)
    counts[bin] = counts[bin]! + 1
    sums[bin * 3] = sums[bin * 3]! + r
    sums[bin * 3 + 1] = sums[bin * 3 + 1]! + g
    sums[bin * 3 + 2] = sums[bin * 3 + 2]! + b
    opaquePixels++
    if (onProgress && p % progressStep === 0) onProgress(p / pixelCount)
  }

  let occupied = 0
  for (let bin = 0; bin < BIN_COUNT; bin++) if (counts[bin]) occupied++

  const points = new Float32Array(occupied * 3)
  const weights = new Uint32Array(occupied)
  const binToPoint = new Int32Array(BIN_COUNT).fill(-1)
  let n = 0
  for (let bin = 0; bin < BIN_COUNT; bin++) {
    const c = counts[bin]!
    if (!c) continue
    rgbToLabInto(
      Math.round(sums[bin * 3]! / c),
      Math.round(sums[bin * 3 + 1]! / c),
      Math.round(sums[bin * 3 + 2]! / c),
      points,
      n * 3,
    )
    weights[n] = c
    binToPoint[bin] = n
    n++
  }

  onProgress?.(1)
  return { points, weights, binToPoint, opaquePixels }
}

export interface Quantization {
  /** Palette colours, sorted by coverage (largest area first). */
  palette: Rgb[]
  /** Pixel count per palette entry. */
  counts: number[]
  /** Histogram point index -> palette index. */
  pointToPalette: Uint8Array
}

/** Clusters the histogram into at most `colorCount` colours. */
export function quantizeHistogram(
  histogram: ColorHistogram,
  colorCount: number,
  onProgress?: (fraction: number) => void,
): Quantization {
  if (histogram.weights.length === 0) {
    return { palette: [], counts: [], pointToPalette: new Uint8Array(0) }
  }
  const result = kmeans({
    points: histogram.points,
    weights: histogram.weights,
    k: Math.min(colorCount, TRANSPARENT_INDEX - 1),
    onProgress,
  })

  const k = result.centroids.length / 3
  const order = Array.from({ length: k }, (_, c) => c).sort(
    (a, b) => result.clusterWeights[b]! - result.clusterWeights[a]!,
  )
  const rank = new Uint8Array(k)
  order.forEach((cluster, i) => (rank[cluster] = i))

  const palette = order.map((c) =>
    labToRgb([
      result.centroids[c * 3]!,
      result.centroids[c * 3 + 1]!,
      result.centroids[c * 3 + 2]!,
    ]),
  )
  const counts = order.map((c) => result.clusterWeights[c]!)
  const pointToPalette = new Uint8Array(result.assignments.length)
  for (let i = 0; i < result.assignments.length; i++) {
    pointToPalette[i] = rank[result.assignments[i]!]!
  }
  return { palette, counts, pointToPalette }
}

/** Maps every pixel to its palette index (TRANSPARENT_INDEX for background). */
export function indexPixels(
  pixels: Uint8ClampedArray,
  histogram: ColorHistogram,
  quantization: Quantization,
  mask?: Uint8Array,
): Uint8Array {
  const pixelCount = pixels.length / 4
  const indices = new Uint8Array(pixelCount)
  for (let p = 0; p < pixelCount; p++) {
    const i = p * 4
    if (pixels[i + 3]! < ALPHA_THRESHOLD || (mask && mask[p])) {
      indices[p] = TRANSPARENT_INDEX
      continue
    }
    const point = histogram.binToPoint[binOf(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!)]!
    indices[p] = quantization.pointToPalette[point]!
  }
  return indices
}
