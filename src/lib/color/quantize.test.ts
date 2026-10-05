import { describe, expect, it } from 'vitest'
import type { Rgb } from './convert'
import { buildHistogram, indexPixels, quantizeHistogram, TRANSPARENT_INDEX } from './quantize'

/** Makes an RGBA buffer from a list of [colour, alpha, count] runs. */
function image(runs: [Rgb, number, number][]): Uint8ClampedArray {
  const total = runs.reduce((s, [, , n]) => s + n, 0)
  const px = new Uint8ClampedArray(total * 4)
  let p = 0
  for (const [[r, g, b], a, n] of runs) {
    for (let i = 0; i < n; i++, p++) px.set([r, g, b, a], p * 4)
  }
  return px
}

describe('buildHistogram', () => {
  it('ignores transparent and masked pixels', () => {
    const px = image([
      [[255, 0, 0], 255, 10],
      [[0, 0, 255], 0, 5],
      [[0, 255, 0], 255, 3],
    ])
    const mask = new Uint8Array(18)
    mask.fill(1, 15) // mask out the green pixels
    const h = buildHistogram(px, mask)
    expect(h.opaquePixels).toBe(10)
    expect(Array.from(h.weights)).toEqual([10])
  })

  it('stores the mean colour of each bin', () => {
    // 200 and 202 fall into the same 5-bit bin; the mean must be 201.
    const px = image([
      [[200, 0, 0], 255, 1],
      [[202, 0, 0], 255, 1],
    ])
    const h = buildHistogram(px)
    expect(h.weights.length).toBe(1)
    const q = quantizeHistogram(h, 1)
    expect(q.palette[0]).toEqual([201, 0, 0])
  })
})

describe('quantizeHistogram + indexPixels', () => {
  const px = image([
    [[235, 235, 235], 255, 60], // light grey, largest area
    [[255, 255, 255], 255, 20],
    [[200, 20, 30], 255, 30], // red
    [[20, 30, 120], 255, 10], // navy
    [[0, 0, 0], 0, 5], // transparent background
  ])

  it('reduces to the requested colour count, sorted by area', () => {
    const h = buildHistogram(px)
    const q = quantizeHistogram(h, 3)
    expect(q.palette).toHaveLength(3)
    expect(q.counts).toEqual([80, 30, 10])
    expect(q.palette[1]).toEqual([200, 20, 30])
    expect(q.palette[2]).toEqual([20, 30, 120])
  })

  it('never returns more colours than exist', () => {
    const q = quantizeHistogram(buildHistogram(px), 12)
    expect(q.palette).toHaveLength(4)
  })

  it('indexes every pixel, marking background as transparent', () => {
    const h = buildHistogram(px)
    const q = quantizeHistogram(h, 3)
    const idx = indexPixels(px, h, q)
    expect(idx).toHaveLength(125)
    expect(idx[0]).toBe(0)
    expect(idx[80]).toBe(1)
    expect(idx[110]).toBe(2)
    expect(idx[124]).toBe(TRANSPARENT_INDEX)
    const sum = q.counts.reduce((a, b) => a + b, 0)
    expect(sum).toBe(Array.from(idx).filter((i) => i !== TRANSPARENT_INDEX).length)
  })

  it('handles fully transparent images', () => {
    const empty = image([[[0, 0, 0], 0, 4]])
    const h = buildHistogram(empty)
    const q = quantizeHistogram(h, 5)
    expect(q.palette).toEqual([])
    expect(Array.from(indexPixels(empty, h, q))).toEqual([255, 255, 255, 255])
  })
})
