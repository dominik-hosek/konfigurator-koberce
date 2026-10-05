// sRGB <-> CIELAB (D65) conversions.

export type Rgb = readonly [r: number, g: number, b: number]
export type Lab = readonly [l: number, a: number, b: number]

// D65 reference white.
const XN = 0.95047
const YN = 1.0
const ZN = 1.08883

const EPSILON = 216 / 24389
const KAPPA = 24389 / 27

// Lookup table: 8-bit sRGB channel -> linear light. Conversions run per pixel, so avoid Math.pow.
const SRGB_TO_LINEAR = new Float64Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, v)) * 255)
}

function f(t: number): number {
  return t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116
}

function fInv(t: number): number {
  const t3 = t * t * t
  return t3 > EPSILON ? t3 : (116 * t - 16) / KAPPA
}

/** Converts 8-bit sRGB channels to CIELAB, writing into `out` at `offset`. */
export function rgbToLabInto(
  r: number,
  g: number,
  b: number,
  out: Float32Array | Float64Array,
  offset: number,
): void {
  const lr = SRGB_TO_LINEAR[r & 255]!
  const lg = SRGB_TO_LINEAR[g & 255]!
  const lb = SRGB_TO_LINEAR[b & 255]!

  const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / XN
  const y = (0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb) / YN
  const z = (0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / ZN

  const fx = f(x)
  const fy = f(y)
  const fz = f(z)

  out[offset] = 116 * fy - 16
  out[offset + 1] = 500 * (fx - fy)
  out[offset + 2] = 200 * (fy - fz)
}

export function rgbToLab([r, g, b]: Rgb): Lab {
  const out = new Float64Array(3)
  rgbToLabInto(r, g, b, out, 0)
  return [out[0]!, out[1]!, out[2]!]
}

export function labToRgb([l, a, b]: Lab): Rgb {
  const fy = (l + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200

  const x = fInv(fx) * XN
  const y = (l > KAPPA * EPSILON ? fy * fy * fy : l / KAPPA) * YN
  const z = fInv(fz) * ZN

  const lr = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z
  const lg = -0.969266 * x + 1.8760108 * y + 0.041556 * z
  const lb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)]
}

export function rgbToHex([r, g, b]: Rgb): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) throw new Error(`Invalid hex colour: ${hex}`)
  return [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)]
}
