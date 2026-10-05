// Procedural "tufted" rendering of a finished design: pile texture, yarn variation and
// grooves where colour areas meet, lit from the top left. Deterministic (seeded), no images.
//
// Steps, all at the output resolution:
// 1. Labels: the design is upscaled with a gentle domain warp, so edges between colours look
//    hand-tufted instead of pixel staircases. The rug outline itself is not warped.
// 2. Distance to the nearest colour boundary (exact distance transform) -> edge grooves.
// 3. Height field = tuft domes (cellular noise on the real tuft pitch) minus grooves.
// 4. Shading from the height field's normals + per-tuft and per-fibre brightness variation.
import type { Rgb } from '../color/convert'
import { TRANSPARENT_INDEX } from '../color/quantize'
import { distanceTransform } from './edt'

/** Distance between tuft rows in a cut-pile rug, in mm. */
export const TUFT_PITCH_MM = 4

export interface TuftedInput {
  /** Palette index per rug-grid pixel; TRANSPARENT_INDEX = outside the rug. */
  indices: Uint8Array
  width: number
  height: number
  colors: readonly Rgb[]
  /** Rug-grid pixels per millimetre. */
  pxPerMm: number
  /** Longest side of the output in pixels (upscaled from the grid, never downscaled). */
  maxSide?: number
  seed?: number
}

export interface TuftedOutput {
  pixels: Uint8ClampedArray
  width: number
  height: number
  /** Output pixels per rug-grid pixel. */
  scale: number
}

// Light from the top left, slightly above.
const LIGHT = (() => {
  const v = [-0.45, -0.55, 0.7]
  const len = Math.hypot(v[0]!, v[1]!, v[2]!)
  return v.map((c) => c / len) as [number, number, number]
})()

/** Integer hash -> [0, 1). */
function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Smooth value noise in [-1, 1]. */
function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash(x0, y0, seed)
  const b = hash(x0 + 1, y0, seed)
  const c = hash(x0, y0 + 1, seed)
  const d = hash(x0 + 1, y0 + 1, seed)
  const top = a + (b - a) * sx
  const bottom = c + (d - c) * sx
  return (top + (bottom - top) * sy) * 2 - 1
}

export function* renderTuftedSteps(input: TuftedInput): Generator<number, TuftedOutput> {
  const { indices, width, height, colors, pxPerMm, maxSide = 1600, seed = 7 } = input
  const scale = Math.max(1, Math.min(3, maxSide / Math.max(width, height)))
  const W = Math.max(1, Math.round(width * scale))
  const H = Math.max(1, Math.round(height * scale))
  const n = W * H
  const CUT = TRANSPARENT_INDEX

  // Tuft pitch in output pixels; below ~2 px the texture would only be noise.
  const tuft = Math.max(2, TUFT_PITCH_MM * pxPerMm * scale)

  // 1. Warped label lookup.
  const labels = new Uint8Array(n)
  const warpAmp = 0.45 * tuft
  const warpFreq = 1 / (tuft * 2.5)
  const lookup = (x: number, y: number) => {
    const gx = Math.min(width - 1, Math.max(0, Math.floor(x / scale)))
    const gy = Math.min(height - 1, Math.max(0, Math.floor(y / scale)))
    return indices[gy * width + gx]!
  }
  for (let y = 0, p = 0; y < H; y++) {
    for (let x = 0; x < W; x++, p++) {
      const straight = lookup(x + 0.5, y + 0.5)
      if (straight === CUT) {
        labels[p] = CUT
        continue
      }
      const wx = x + 0.5 + warpAmp * valueNoise(x * warpFreq, y * warpFreq, seed + 1)
      const wy = y + 0.5 + warpAmp * valueNoise(x * warpFreq, y * warpFreq, seed + 2)
      const warped = lookup(wx, wy)
      labels[p] = warped === CUT ? straight : warped
    }
  }
  yield 0.2

  // 2. Distance to the nearest boundary between different labels (the rug edge included).
  const boundary = new Uint8Array(n)
  for (let y = 0, p = 0; y < H; y++) {
    for (let x = 0; x < W; x++, p++) {
      const l = labels[p]
      if ((x < W - 1 && labels[p + 1] !== l) || (y < H - 1 && labels[p + W] !== l)) {
        boundary[p] = 1
      }
    }
  }
  const { dist2 } = distanceTransform(W, H, boundary)
  yield 0.45

  // 3. Height field: tuft domes on a jittered grid, minus grooves along boundaries.
  const heights = new Float32Array(n)
  const tuftShade = new Float32Array(n)
  const groove = Math.max(1, 0.55 * tuft)
  const domeRadius2 = (0.75 * tuft) ** 2
  for (let y = 0, p = 0; y < H; y++) {
    const cy = Math.floor(y / tuft)
    for (let x = 0; x < W; x++, p++) {
      if (labels[p] === CUT) continue
      const cx = Math.floor(x / tuft)
      let best = Infinity
      let bestId = 0
      for (let j = cy - 1; j <= cy + 1; j++) {
        for (let i = cx - 1; i <= cx + 1; i++) {
          // Rows are offset by half a tuft, like a real tufting pattern.
          const ox = (i + 0.5 + (j & 1 ? 0.5 : 0) + (hash(i, j, seed + 3) - 0.5) * 0.5) * tuft
          const oy = (j + 0.5 + (hash(i, j, seed + 4) - 0.5) * 0.5) * tuft
          const d = (x - ox) ** 2 + (y - oy) ** 2
          if (d < best) {
            best = d
            bestId = i * 92821 + j
          }
        }
      }
      const dome = Math.max(0, 1 - best / domeRadius2)
      const g = Math.exp(-dist2[p]! / (groove * groove))
      heights[p] = 0.55 * Math.sqrt(dome) - 1.1 * g
      tuftShade[p] = (hash(bestId, 0, seed + 5) - 0.5) * 0.09
    }
    if (y % 64 === 63) yield 0.45 + (0.3 * y) / H
  }

  // 4. Shading.
  const pixels = new Uint8ClampedArray(n * 4)
  const slope = 0.9 * Math.min(4, tuft / 3)
  for (let y = 0, p = 0; y < H; y++) {
    for (let x = 0; x < W; x++, p++) {
      const label = labels[p]!
      if (label === CUT) continue
      const c = colors[label]
      if (!c) continue
      const hl = x > 0 && labels[p - 1] !== CUT ? heights[p - 1]! : heights[p]!
      const hr = x < W - 1 && labels[p + 1] !== CUT ? heights[p + 1]! : heights[p]!
      const hu = y > 0 && labels[p - W] !== CUT ? heights[p - W]! : heights[p]!
      const hd = y < H - 1 && labels[p + W] !== CUT ? heights[p + W]! : heights[p]!
      const nx = -(hr - hl) * slope
      const ny = -(hd - hu) * slope
      const len = Math.hypot(nx, ny, 1)
      const diffuse = (nx * LIGHT[0] + ny * LIGHT[1] + LIGHT[2]) / len
      // Calibrated so a flat, lit surface keeps the exact yarn colour (shade 1): only slopes,
      // grooves (ambient occlusion) and fibre noise move it.
      const groovePart = Math.exp(-dist2[p]! / (groove * groove))
      const occlusion = 1 - 0.28 * groovePart
      const fibre = (hash(x, y, seed + 6) - 0.5) * 0.06
      const shade = (1 + 1.1 * (diffuse - LIGHT[2])) * occlusion + tuftShade[p]! + fibre
      const i = p * 4
      pixels[i] = c[0] * shade
      pixels[i + 1] = c[1] * shade
      pixels[i + 2] = c[2] * shade
      pixels[i + 3] = 255
    }
    if (y % 64 === 63) yield 0.75 + (0.25 * y) / H
  }

  yield 1
  return { pixels, width: W, height: H, scale }
}

export function renderTufted(input: TuftedInput): TuftedOutput {
  const it = renderTuftedSteps(input)
  for (;;) {
    const step = it.next()
    if (step.done) return step.value
  }
}
