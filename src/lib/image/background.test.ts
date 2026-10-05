import { describe, expect, it } from 'vitest'
import type { Rgb } from '../color/convert'
import {
  alphaMask,
  colorMask,
  computeBackgroundMask,
  dominantBorderColor,
  hasTransparency,
  sampleColor,
} from './background'

/** Builds an RGBA image from an ASCII map: each char maps to a colour (or '.' = transparent). */
function fromMap(rows: string[], colors: Record<string, Rgb>) {
  const height = rows.length
  const width = rows[0]!.length
  const pixels = new Uint8ClampedArray(width * height * 4)
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const i = (y * width + x) * 4
      if (ch === '.') return
      const [r, g, b] = colors[ch]!
      pixels.set([r, g, b, 255], i)
    }),
  )
  return { pixels, width, height }
}

const C: Record<string, Rgb> = {
  w: [250, 250, 250],
  v: [240, 242, 238], // slightly different white
  r: [200, 20, 30],
}

function maskToRows(mask: Uint8Array, width: number) {
  const rows: string[] = []
  for (let i = 0; i < mask.length; i += width) {
    rows.push(Array.from(mask.subarray(i, i + width), (m) => (m ? '#' : '-')).join(''))
  }
  return rows
}

// White background, red ring with a white hole in the middle.
const ring = fromMap(['wwwwwww', 'wrrrrrw', 'wrwwwrw', 'wrrrrrw', 'wwwwwvw'], C)

describe('transparency', () => {
  it('detects transparent pixels and builds an alpha mask', () => {
    const img = fromMap(['..r', '.rr'], C)
    expect(hasTransparency(img.pixels)).toBe(true)
    expect(Array.from(alphaMask(img.pixels))).toEqual([1, 1, 0, 1, 0, 0])
    expect(hasTransparency(ring.pixels)).toBe(false)
  })
})

describe('colorMask', () => {
  const base = { colors: [C.w!], seeds: [{ x: 0, y: 0 }], seedBorder: false, tolerance: 10 }

  it('flood-fills only the area connected to the seed', () => {
    const mask = colorMask(ring.pixels, ring.width, ring.height, {
      mode: 'color',
      ...base,
      contiguous: true,
    })
    expect(maskToRows(mask, ring.width)).toEqual([
      '#######',
      '#-----#',
      '#-----#',
      '#-----#',
      '#######',
    ])
  })

  it('removes enclosed areas of the same colour when not contiguous', () => {
    const mask = colorMask(ring.pixels, ring.width, ring.height, {
      mode: 'color',
      ...base,
      contiguous: false,
    })
    expect(maskToRows(mask, ring.width)[2]).toBe('#-###-#')
  })

  it('respects the tolerance', () => {
    const strict = colorMask(ring.pixels, ring.width, ring.height, {
      mode: 'color',
      ...base,
      tolerance: 1,
      contiguous: true,
    })
    expect(strict[4 * 7 + 5]).toBe(0) // the slightly different white is kept
  })

  it('can start from the whole border without seeds', () => {
    const mask = colorMask(ring.pixels, ring.width, ring.height, {
      mode: 'color',
      ...base,
      seeds: [],
      seedBorder: true,
      contiguous: true,
    })
    expect(mask.reduce((a, b) => a + b, 0)).toBe(20)
  })
})

describe('computeBackgroundMask', () => {
  it('resolves auto to alpha only for transparent images', () => {
    expect(computeBackgroundMask(ring.pixels, 7, 5, { mode: 'auto' }).mode).toBe('none')
    const t = fromMap(['.r', 'r.'], C)
    expect(computeBackgroundMask(t.pixels, 2, 2, { mode: 'auto' }).mode).toBe('alpha')
  })
})

describe('sampling helpers', () => {
  it('averages a window and finds the dominant border colour', () => {
    expect(sampleColor(ring.pixels, 7, 5, 0, 0, 0)).toEqual([250, 250, 250])
    expect(sampleColor(fromMap(['..'], C).pixels, 2, 1, 0, 0)).toBeNull()
    const dom = dominantBorderColor(ring.pixels, 7, 5)
    expect(dom?.color).toEqual([250, 250, 250])
    expect(dom?.share).toBe(19 / 20)
  })
})
