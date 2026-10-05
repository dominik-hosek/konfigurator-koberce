import { describe, expect, it } from 'vitest'
import { detailRadiusPx, pxPerMm } from './dimensions'

describe('dimensions', () => {
  it('converts rug width to pixel density', () => {
    expect(pxPerMm(1000, 2000)).toBe(0.5)
    expect(() => pxPerMm(0, 100)).toThrow()
    expect(() => pxPerMm(100, 0)).toThrow()
  })

  it('computes the smoothing radius from the minimum detail', () => {
    // 1024 px across a 1200 mm rug, 10 mm detail -> 5 mm radius -> ~4.27 px
    expect(detailRadiusPx(10, 1024, 1200)).toBeCloseTo(4.267, 3)
    // A smaller rug means the same detail covers more pixels.
    expect(detailRadiusPx(10, 1024, 600)).toBeCloseTo(8.533, 3)
  })
})
