import { describe, expect, it } from 'vitest'
import type { Lab } from './convert'
import { deltaE2000 } from './deltaE'

// Reference pairs from Sharma, Wu & Dalal, "The CIEDE2000 Color-Difference Formula" (2005).
const SHARMA: [Lab, Lab, number][] = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
  [[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
  [[50, 0, 0], [50, -1, 2], 2.3669],
  [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
  [[50, 2.49, -0.001], [50, -2.49, 0.0011], 7.2195],
  [[50, 2.5, 0], [73, 25, -18], 27.1492],
  [[50, 2.5, 0], [50, 3.1736, 0.5854], 1.0],
  [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
  [[63.0109, -31.0961, -5.8663], [62.8187, -29.7946, -4.0864], 1.263],
  [[90.8027, -2.0831, 1.441], [91.1528, -1.6435, 0.0447], 1.4441],
  [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
]

describe('deltaE2000', () => {
  it.each(SHARMA)('matches the reference data (%j vs %j)', (a, b, expected) => {
    expect(deltaE2000(a, b)).toBeCloseTo(expected, 4)
  })

  it('is symmetric and zero for identical colours', () => {
    for (const [a, b] of SHARMA) {
      expect(deltaE2000(a, b)).toBeCloseTo(deltaE2000(b, a), 10)
      expect(deltaE2000(a, a)).toBe(0)
    }
  })
})
