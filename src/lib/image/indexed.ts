import type { Rgb } from '../color/convert'
import { TRANSPARENT_INDEX } from '../color/quantize'

/** Expands palette indices to an RGBA buffer. Background pixels become fully transparent. */
export function indexedToRgba(indices: Uint8Array, palette: readonly Rgb[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(indices.length * 4)
  for (let p = 0; p < indices.length; p++) {
    const idx = indices[p]!
    if (idx === TRANSPARENT_INDEX) continue
    const c = palette[idx]
    if (!c) continue
    const i = p * 4
    out[i] = c[0]
    out[i + 1] = c[1]
    out[i + 2] = c[2]
    out[i + 3] = 255
  }
  return out
}
