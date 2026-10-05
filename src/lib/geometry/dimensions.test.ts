import { describe, expect, it } from 'vitest'
import { lineRadiusPx, minIslandAreaPx, pxPerMm } from './dimensions'

describe('dimensions', () => {
  it('converts rug width to pixel density', () => {
    expect(pxPerMm(1000, 2000)).toBe(0.5)
    expect(() => pxPerMm(0, 100)).toThrow()
    expect(() => pxPerMm(100, 0)).toThrow()
  })

  it('computes the line radius from the minimum line width', () => {
    // 1024 px across a 1200 mm rug, 5 mm line -> 2.5 mm radius -> ~2.13 px
    expect(lineRadiusPx(5, pxPerMm(1024, 1200))).toBeCloseTo(2.133, 3)
    // A smaller rug means the same line covers more pixels.
    expect(lineRadiusPx(5, pxPerMm(1024, 600))).toBeCloseTo(4.267, 3)
  })

  it('computes the minimum island area from the minimum detail', () => {
    // 1 px per mm, 10 mm dot -> π · 5² px
    expect(minIslandAreaPx(10, 1)).toBeCloseTo(Math.PI * 25)
    expect(minIslandAreaPx(10, 0.5)).toBeCloseTo((Math.PI * 25) / 4)
  })
})
