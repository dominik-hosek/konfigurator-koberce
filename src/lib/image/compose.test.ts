import { describe, expect, it } from 'vitest'
import { TRANSPARENT_INDEX as T } from '../color/quantize'
import { computeLayout, type RugLayout } from '../geometry/layout'
import { composeRug, CUT, fillHoles } from './compose'
import { measureMotif } from './motif'

function layout(over: Partial<RugLayout>): RugLayout {
  return {
    shape: 'rectangle',
    fit: 'enclose',
    pxPerMm: 1,
    widthMm: 0,
    heightMm: 0,
    marginMm: 0,
    frame: { x: 0, y: 0, width: 4, height: 4 },
    adjusted: false,
    ...over,
  }
}

const rows = (labels: Uint8Array, width: number) => {
  const out: string[] = []
  for (let i = 0; i < labels.length; i += width) {
    out.push(
      Array.from(labels.subarray(i, i + width), (l) => (l === CUT ? '.' : String(l))).join(''),
    )
  }
  return out
}

describe('measureMotif', () => {
  it('finds the bbox and enclosing ellipse/circle', () => {
    // 6×4 image, motif is a 2×2 block at (2,1).
    const labels = new Uint8Array(24).fill(T)
    for (const p of [8, 9, 14, 15]) labels[p] = 0
    const m = measureMotif(labels, 6, 4)
    expect(m.hasBackground).toBe(true)
    expect(m.bbox).toEqual({ x0: 2, y0: 1, x1: 4, y1: 3 })
    expect(m.circleRadius).toBeCloseTo(Math.SQRT2)
    expect(m.ellipseScale).toBeCloseTo(Math.SQRT2)
  })

  it('treats an image without background as full-bleed', () => {
    const m = measureMotif(new Uint8Array(6), 3, 2)
    expect(m.hasBackground).toBe(false)
    expect(m.bbox).toEqual({ x0: 0, y0: 0, x1: 3, y1: 2 })
  })

  it('falls back to the whole image when nothing is left', () => {
    const m = measureMotif(new Uint8Array(4).fill(T), 2, 2)
    expect(m.hasBackground).toBe(false)
  })
})

describe('composeRug', () => {
  it('fills background inside a rectangle and places pixels outside the image as fill', () => {
    const labels = new Uint8Array([0, T, T, 1])
    const res = composeRug(labels, 2, 2, layout({ frame: { x: -1, y: 0, width: 3, height: 2 } }), 7)
    expect(rows(res.labels, 3)).toEqual(['707', '771'])
    expect(res.rugPixels).toBe(6)
    expect(res.fillPixels).toBe(4)
  })

  it('cuts everything outside a circle', () => {
    const res = composeRug(
      new Uint8Array(16),
      4,
      4,
      layout({ shape: 'circle', frame: { x: 0, y: 0, width: 4, height: 4 } }),
      5,
    )
    expect(rows(res.labels, 4)).toEqual(['.00.', '0000', '0000', '.00.'])
  })

  it('follows the motif outline with a margin for the contour shape', () => {
    // 7×7 image with a single motif pixel in the middle; margin 2 px.
    const labels = new Uint8Array(49).fill(T)
    labels[24] = 3
    const res = composeRug(
      labels,
      7,
      7,
      layout({ shape: 'contour', marginMm: 2, frame: { x: 0, y: 0, width: 7, height: 7 } }),
      9,
    )
    expect(rows(res.labels, 7)).toEqual([
      '.......',
      '...9...',
      '..999..',
      '.99399.',
      '..999..',
      '...9...',
      '.......',
    ])
  })

  it('works end to end with computeLayout', () => {
    const labels = new Uint8Array(100).fill(T)
    for (let y = 3; y < 7; y++) for (let x = 2; x < 8; x++) labels[y * 10 + x] = 0
    const motif = measureMotif(labels, 10, 10)
    const limits = { minWidthMm: 1, maxWidthMm: 1e4, minHeightMm: 1, maxHeightMm: 1e4 }
    const l = computeLayout(
      motif,
      { shape: 'rectangle', widthMm: 80, heightMm: null, marginMm: 10 },
      limits,
    )
    // 6 px motif across 60 mm -> 0.1 px/mm; frame = 8 × 6 px around the motif.
    expect(l.frame).toEqual({ x: 1, y: 2, width: 8, height: 6 })
    const res = composeRug(labels, 10, 10, l, 1)
    expect(res.fillPixels).toBe(48 - 24)
  })
})

describe('fillHoles', () => {
  it('fills enclosed gaps only', () => {
    const mask = new Uint8Array([1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0])
    fillHoles(mask, 4, 3)
    expect(Array.from(mask)).toEqual([1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0])
  })
})
