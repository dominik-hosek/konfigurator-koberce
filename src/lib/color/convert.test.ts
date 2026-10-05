import { describe, expect, it } from 'vitest'
import { hexToRgb, labToRgb, rgbToHex, rgbToLab, type Rgb } from './convert'

function expectLab(actual: readonly number[], expected: readonly number[], precision = 1) {
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, precision))
}

describe('rgbToLab', () => {
  it('maps reference colours to known Lab values', () => {
    expectLab(rgbToLab([255, 255, 255]), [100, 0, 0])
    expectLab(rgbToLab([0, 0, 0]), [0, 0, 0])
    expectLab(rgbToLab([255, 0, 0]), [53.24, 80.09, 67.2])
    expectLab(rgbToLab([0, 255, 0]), [87.73, -86.18, 83.18])
    expectLab(rgbToLab([0, 0, 255]), [32.3, 79.19, -107.86])
    expectLab(rgbToLab([128, 128, 128]), [53.59, 0, 0])
  })
})

describe('labToRgb', () => {
  it('round-trips sRGB colours exactly', () => {
    const samples: Rgb[] = [
      [0, 0, 0],
      [255, 255, 255],
      [12, 200, 77],
      [240, 16, 128],
      [1, 2, 3],
      [128, 64, 32],
    ]
    for (const rgb of samples) expect(labToRgb(rgbToLab(rgb))).toEqual(rgb)
  })

  it('clamps out-of-gamut Lab values', () => {
    const rgb = labToRgb([50, 200, -200])
    rgb.forEach((c) => {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(255)
    })
  })
})

describe('hex helpers', () => {
  it('convert both ways', () => {
    expect(rgbToHex([255, 8, 170])).toBe('#FF08AA')
    expect(hexToRgb('#ff08aa')).toEqual([255, 8, 170])
    expect(() => hexToRgb('nope')).toThrow()
  })
})
