import { describe, expect, it } from 'vitest'
import { kmeans } from './kmeans'

/** Builds a flat point list from groups of (center, count) with small jitter. */
function blobs(groups: { center: [number, number, number]; count: number }[]) {
  const pts: number[] = []
  const weights: number[] = []
  groups.forEach(({ center, count }) => {
    for (let i = 0; i < count; i++) {
      pts.push(
        center[0] + (i % 3) - 1,
        center[1] + ((i * 7) % 3) - 1,
        center[2] + ((i * 5) % 3) - 1,
      )
      weights.push(1)
    }
  })
  return { points: new Float64Array(pts), weights }
}

function sortedCentroids(c: Float64Array): number[][] {
  const out: number[][] = []
  for (let i = 0; i < c.length; i += 3) out.push([c[i]!, c[i + 1]!, c[i + 2]!])
  return out.sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!)
}

describe('kmeans', () => {
  it('recovers well separated clusters', () => {
    const { points, weights } = blobs([
      { center: [10, 0, 0], count: 30 },
      { center: [50, 40, -20], count: 30 },
      { center: [90, -30, 60], count: 30 },
    ])
    const res = kmeans({ points, weights, k: 3 })
    const cs = sortedCentroids(res.centroids)
    expect(cs).toHaveLength(3)
    expect(cs[0]![0]).toBeCloseTo(10, 0)
    expect(cs[1]![0]).toBeCloseTo(50, 0)
    expect(cs[2]![0]).toBeCloseTo(90, 0)
    expect(Array.from(res.clusterWeights).sort()).toEqual([30, 30, 30])
  })

  it('is deterministic for the same seed', () => {
    const { points, weights } = blobs([
      { center: [20, 10, 10], count: 25 },
      { center: [60, -10, 30], count: 25 },
      { center: [70, 40, -40], count: 25 },
    ])
    const a = kmeans({ points, weights, k: 4, seed: 7 })
    const b = kmeans({ points, weights, k: 4, seed: 7 })
    expect(Array.from(a.centroids)).toEqual(Array.from(b.centroids))
    expect(Array.from(a.assignments)).toEqual(Array.from(b.assignments))
  })

  it('returns fewer clusters when there are fewer distinct points than k', () => {
    const points = new Float64Array([0, 0, 0, 0, 0, 0, 100, 0, 0])
    const res = kmeans({ points, weights: [1, 1, 1], k: 5 })
    expect(res.centroids.length / 3).toBe(2)
  })

  it('respects weights when placing centroids', () => {
    // One cluster: centroid must be the weighted mean.
    const points = new Float64Array([0, 0, 0, 10, 0, 0])
    const res = kmeans({ points, weights: [3, 1], k: 1 })
    expect(res.centroids[0]).toBeCloseTo(2.5)
  })

  it('reports progress ending at 1', () => {
    const { points, weights } = blobs([
      { center: [0, 0, 0], count: 10 },
      { center: [50, 50, 50], count: 10 },
    ])
    const progress: number[] = []
    kmeans({ points, weights, k: 2, onProgress: (p) => progress.push(p) })
    expect(progress.at(-1)).toBe(1)
    expect(progress.every((p, i) => i === 0 || p >= progress[i - 1]!)).toBe(true)
  })

  it('validates input', () => {
    expect(() => kmeans({ points: new Float64Array(2), weights: [1], k: 1 })).toThrow()
    expect(() => kmeans({ points: new Float64Array(0), weights: [], k: 1 })).toThrow()
  })
})
