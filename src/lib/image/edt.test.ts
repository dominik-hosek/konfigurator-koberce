import { describe, expect, it } from 'vitest'
import { distanceTransform, NO_SITE_DISTANCE } from './edt'

function bruteForce(width: number, height: number, sites: Set<number>) {
  const out: number[] = []
  for (let p = 0; p < width * height; p++) {
    let best = Infinity
    for (const s of sites) {
      const dx = (p % width) - (s % width)
      const dy = Math.floor(p / width) - Math.floor(s / width)
      best = Math.min(best, dx * dx + dy * dy)
    }
    out.push(best)
  }
  return out
}

describe('distanceTransform', () => {
  it('matches brute force on random site sets', () => {
    let seed = 42
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    for (let trial = 0; trial < 20; trial++) {
      const width = 3 + Math.floor(rand() * 15)
      const height = 3 + Math.floor(rand() * 15)
      const sites = new Set<number>()
      const count = 1 + Math.floor(rand() * 6)
      for (let i = 0; i < count; i++) sites.add(Math.floor(rand() * width * height))

      const siteMask = new Uint8Array(width * height)
      for (const p of sites) siteMask[p] = 1
      const { dist2, nearest } = distanceTransform(width, height, siteMask, true)
      expect(Array.from(dist2)).toEqual(bruteForce(width, height, sites))
      // The nearest site must be a site at exactly that distance.
      nearest!.forEach((s, p) => {
        expect(sites.has(s)).toBe(true)
        const dx = (p % width) - (s % width)
        const dy = Math.floor(p / width) - Math.floor(s / width)
        expect(dx * dx + dy * dy).toBe(dist2[p])
      })
    }
  })

  it('reports a huge distance when there are no sites', () => {
    const { dist2 } = distanceTransform(4, 3, new Uint8Array(12))
    expect(Math.min(...dist2)).toBeGreaterThanOrEqual(NO_SITE_DISTANCE)
  })
})
