// Background detection without AI: alpha channel, or colour picked by the customer with a
// tolerance, optionally flood-filled from the picked points / image border.
import { rgbToLabInto, type Rgb } from '../color/convert'
import { ALPHA_THRESHOLD } from '../color/quantize'

export interface Point {
  x: number
  y: number
}

/** Background settings as chosen in the UI. */
export type BackgroundSettings =
  /** Use the alpha channel if the image has transparency, otherwise keep everything. */
  | { mode: 'auto' }
  | { mode: 'none' }
  | {
      mode: 'color'
      /** Reference background colours. */
      colors: Rgb[]
      /** Flood fill start points (ignored when `contiguous` is false). */
      seeds: Point[]
      /** Also start the flood fill from every matching pixel on the image border. */
      seedBorder: boolean
      /** ΔE (CIE76) tolerance around the reference colours. */
      tolerance: number
      /** true: only areas connected to a seed; false: every matching pixel. */
      contiguous: boolean
    }

/** True if a meaningful share of pixels is transparent. */
export function hasTransparency(pixels: Uint8ClampedArray, minFraction = 0.002): boolean {
  const n = pixels.length / 4
  const limit = Math.max(1, Math.floor(n * minFraction))
  let count = 0
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i]! < ALPHA_THRESHOLD && ++count >= limit) return true
  }
  return false
}

/** Mask (1 = background) of transparent pixels. */
export function alphaMask(pixels: Uint8ClampedArray): Uint8Array {
  const mask = new Uint8Array(pixels.length / 4)
  for (let p = 0; p < mask.length; p++) mask[p] = pixels[p * 4 + 3]! < ALPHA_THRESHOLD ? 1 : 0
  return mask
}

/** Average colour of opaque pixels in a (2r+1)² window, to be robust against noise. */
export function sampleColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  radius = 2,
): Rgb | null {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  const cx = Math.round(x)
  const cy = Math.round(y)
  for (let yy = Math.max(0, cy - radius); yy <= Math.min(height - 1, cy + radius); yy++) {
    for (let xx = Math.max(0, cx - radius); xx <= Math.min(width - 1, cx + radius); xx++) {
      const i = (yy * width + xx) * 4
      if (pixels[i + 3]! < ALPHA_THRESHOLD) continue
      r += pixels[i]!
      g += pixels[i + 1]!
      b += pixels[i + 2]!
      n++
    }
  }
  return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : null
}

function borderIndices(width: number, height: number): number[] {
  const out: number[] = []
  for (let x = 0; x < width; x++) {
    out.push(x)
    if (height > 1) out.push((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y++) {
    out.push(y * width)
    if (width > 1) out.push(y * width + width - 1)
  }
  return out
}

/**
 * Most common colour along the image border (4-bit-per-channel buckets, averaged).
 * Returns null if the border is mostly transparent or has no dominant colour.
 */
export function dominantBorderColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  minShare = 0.25,
): { color: Rgb; share: number } | null {
  const idx = borderIndices(width, height)
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (const p of idx) {
    const i = p * 4
    if (pixels[i + 3]! < ALPHA_THRESHOLD) continue
    const key = ((pixels[i]! >> 4) << 8) | ((pixels[i + 1]! >> 4) << 4) | (pixels[i + 2]! >> 4)
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    bucket.n++
    bucket.r += pixels[i]!
    bucket.g += pixels[i + 1]!
    bucket.b += pixels[i + 2]!
    buckets.set(key, bucket)
  }
  let best: { n: number; r: number; g: number; b: number } | null = null
  for (const bucket of buckets.values()) if (!best || bucket.n > best.n) best = bucket
  if (!best) return null
  const share = best.n / idx.length
  if (share < minShare) return null
  return {
    color: [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)],
    share,
  }
}

/** Per-pixel test "is this colour within tolerance of any reference colour". */
function colorMatcher(pixels: Uint8ClampedArray, colors: readonly Rgb[], tolerance: number) {
  const refs = new Float64Array(colors.length * 3)
  colors.forEach(([r, g, b], i) => rgbToLabInto(r, g, b, refs, i * 3))
  const lab = new Float64Array(3)
  const tol2 = tolerance * tolerance
  return (p: number): boolean => {
    const i = p * 4
    if (pixels[i + 3]! < ALPHA_THRESHOLD) return true
    rgbToLabInto(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, lab, 0)
    for (let c = 0; c < refs.length; c += 3) {
      const dl = lab[0]! - refs[c]!
      const da = lab[1]! - refs[c + 1]!
      const db = lab[2]! - refs[c + 2]!
      if (dl * dl + da * da + db * db <= tol2) return true
    }
    return false
  }
}

/** Mask (1 = background) for the 'color' mode. Transparent pixels always count as background. */
export function colorMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  settings: Extract<BackgroundSettings, { mode: 'color' }>,
): Uint8Array {
  const n = width * height
  const mask = new Uint8Array(n)
  if (settings.colors.length === 0) return alphaMask(pixels)
  const matches = colorMatcher(pixels, settings.colors, settings.tolerance)

  if (!settings.contiguous) {
    for (let p = 0; p < n; p++) mask[p] = matches(p) ? 1 : 0
    return mask
  }

  // 0 = unvisited, 1 = background, 2 = visited but not background.
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  const visit = (p: number) => {
    if (mask[p] !== 0) return
    if (matches(p)) {
      mask[p] = 1
      queue[tail++] = p
    } else {
      mask[p] = 2
    }
  }

  for (const s of settings.seeds) {
    const x = Math.round(s.x)
    const y = Math.round(s.y)
    if (x >= 0 && y >= 0 && x < width && y < height) visit(y * width + x)
  }
  if (settings.seedBorder) for (const p of borderIndices(width, height)) visit(p)

  while (head < tail) {
    const p = queue[head++]!
    const x = p % width
    if (x > 0) visit(p - 1)
    if (x < width - 1) visit(p + 1)
    if (p >= width) visit(p - width)
    if (p < n - width) visit(p + width)
  }

  for (let p = 0; p < n; p++) mask[p] = mask[p] === 1 ? 1 : 0
  return mask
}

/** Resolved mode actually applied (useful for the UI when settings say 'auto'). */
export type ResolvedBackgroundMode = 'none' | 'alpha' | 'color'

export function computeBackgroundMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  settings: BackgroundSettings,
): { mask: Uint8Array | undefined; mode: ResolvedBackgroundMode } {
  switch (settings.mode) {
    case 'none':
      return { mask: undefined, mode: 'none' }
    case 'auto':
      return hasTransparency(pixels)
        ? { mask: alphaMask(pixels), mode: 'alpha' }
        : { mask: undefined, mode: 'none' }
    case 'color':
      return { mask: colorMask(pixels, width, height, settings), mode: 'color' }
  }
}
