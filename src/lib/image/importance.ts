// Per-pixel importance for colour clustering, without AI: areas with a lot of local detail
// (faces, text, patterns) weigh more than large flat areas (sky, walls, a plain jacket).
// Plain k-means spends its colours on whatever covers the most pixels; with this weighting
// a face that covers 10 % of a photo still gets enough shades for eyes, lips and skin.

export interface ImportanceOptions {
  /** Neighbourhood radius as a fraction of the shorter image side. */
  radiusFraction?: number
  /** Clamp of the weight relative to the average detail level. */
  min?: number
  max?: number
  /** Extra weight multiplier for skin-toned pixels (1 disables it). */
  skinBoost?: number
}

/**
 * Classic skin-tone test in YCbCr (Chai & Ngan), plus a minimum saturation so warm greys
 * (beige walls, paper) don't count. Covers light to dark skin under ordinary lighting.
 * Used only to give faces more colour shades, never to cut anything out.
 */
export function isSkinTone(r: number, g: number, b: number): boolean {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
  const y = 0.299 * r + 0.587 * g + 0.114 * b
  const max = Math.max(r, g, b)
  const saturation = max > 0 ? (max - Math.min(r, g, b)) / max : 0
  return (
    y > 40 &&
    cb >= 77 &&
    cb <= 127 &&
    cr >= 133 &&
    cr <= 173 &&
    r > b &&
    saturation >= 0.18 &&
    saturation <= 0.8
  )
}

/**
 * Returns a weight per pixel: sqrt(local detail / average detail), clamped to [min, max],
 * times `skinBoost` for skin-toned pixels. Masked pixels (non-zero in `mask`) get weight 0
 * and do not count towards the average.
 */
export function detailImportance(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  mask?: Uint8Array,
  { radiusFraction = 1 / 60, min = 0.25, max = 4, skinBoost = 3 }: ImportanceOptions = {},
): Float32Array {
  const n = width * height
  const lum = new Float32Array(n)
  for (let p = 0; p < n; p++) {
    const i = p * 4
    lum[p] = 0.299 * pixels[i]! + 0.587 * pixels[i + 1]! + 0.114 * pixels[i + 2]!
  }

  // Sobel gradient magnitude (L1), zero on the border and on masked pixels.
  const grad = new Float64Array(n)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x
      if (mask?.[p]) continue
      const tl = lum[p - width - 1]!
      const t = lum[p - width]!
      const tr = lum[p - width + 1]!
      const l = lum[p - 1]!
      const r = lum[p + 1]!
      const bl = lum[p + width - 1]!
      const b = lum[p + width]!
      const br = lum[p + width + 1]!
      const gx = tr + 2 * r + br - tl - 2 * l - bl
      const gy = bl + 2 * b + br - tl - 2 * t - tr
      grad[p] = Math.abs(gx) + Math.abs(gy)
    }
  }

  // Box-average the gradient with an integral image: "how detailed is this neighbourhood".
  const radius = Math.max(2, Math.round(Math.min(width, height) * radiusFraction))
  const integral = new Float64Array((width + 1) * (height + 1))
  for (let y = 0; y < height; y++) {
    let rowSum = 0
    for (let x = 0; x < width; x++) {
      rowSum += grad[y * width + x]!
      integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1]! + rowSum
    }
  }

  const local = new Float64Array(n)
  let total = 0
  let counted = 0
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius)
    const y1 = Math.min(height, y + radius + 1)
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      if (mask?.[p]) continue
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(width, x + radius + 1)
      const sum =
        integral[y1 * (width + 1) + x1]! -
        integral[y0 * (width + 1) + x1]! -
        integral[y1 * (width + 1) + x0]! +
        integral[y0 * (width + 1) + x0]!
      local[p] = sum / ((x1 - x0) * (y1 - y0))
      total += local[p]!
      counted++
    }
  }

  const out = new Float32Array(n)
  const mean = counted ? total / counted : 0
  for (let p = 0; p < n; p++) {
    if (mask?.[p]) continue
    const detail = mean > 0 ? Math.min(max, Math.max(min, Math.sqrt(local[p]! / mean))) : 1
    const i = p * 4
    out[p] = isSkinTone(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!) ? detail * skinBoost : detail
  }
  return out
}
