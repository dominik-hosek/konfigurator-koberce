// Weighted k-means with k-means++ seeding on 3-D points (CIELAB colours).
// Points are usually histogram bins (a colour + its pixel count), which keeps the
// work independent of image size.
import { createRandom } from '../random'

export interface KMeansOptions {
  /** Flat array of 3-D points: [x0, y0, z0, x1, y1, z1, ...]. */
  points: Float32Array | Float64Array
  /** Weight per point (e.g. pixel count). Must be > 0. */
  weights: ArrayLike<number>
  /** Requested cluster count. Fewer clusters are returned if there are fewer distinct points. */
  k: number
  maxIterations?: number
  /** Stop when no centroid moves more than this (squared distance). */
  tolerance?: number
  seed?: number
  /** Called with 0..1 after each iteration. */
  onProgress?: (fraction: number) => void
}

export interface KMeansResult {
  /** Flat array of k' centroids (k' <= k). */
  centroids: Float64Array
  /** Cluster index per input point. */
  assignments: Uint16Array
  /** Total weight per cluster. */
  clusterWeights: Float64Array
  iterations: number
}

function dist2(a: ArrayLike<number>, ai: number, b: ArrayLike<number>, bi: number): number {
  const d0 = a[ai]! - b[bi]!
  const d1 = a[ai + 1]! - b[bi + 1]!
  const d2 = a[ai + 2]! - b[bi + 2]!
  return d0 * d0 + d1 * d1 + d2 * d2
}

/** Picks an index with probability proportional to `scores`. */
function pickWeighted(scores: Float64Array, total: number, random: () => number): number {
  let target = random() * total
  for (let i = 0; i < scores.length; i++) {
    target -= scores[i]!
    if (target <= 0 && scores[i]! > 0) return i
  }
  // Floating point leftovers: return the last point with a positive score.
  for (let i = scores.length - 1; i >= 0; i--) if (scores[i]! > 0) return i
  return 0
}

function seedCentroids(
  points: ArrayLike<number>,
  weights: ArrayLike<number>,
  k: number,
  random: () => number,
): Float64Array {
  const n = weights.length
  const chosen: number[] = []
  const scores = new Float64Array(n)
  let total = 0
  for (let i = 0; i < n; i++) {
    scores[i] = weights[i]!
    total += scores[i]!
  }
  chosen.push(pickWeighted(scores, total, random))

  // Nearest chosen centroid distance per point, updated incrementally.
  const nearest = new Float64Array(n).fill(Infinity)
  while (chosen.length < k) {
    const last = chosen[chosen.length - 1]! * 3
    total = 0
    for (let i = 0; i < n; i++) {
      const d = dist2(points, i * 3, points, last)
      if (d < nearest[i]!) nearest[i] = d
      scores[i] = nearest[i]! * weights[i]!
      total += scores[i]!
    }
    // Every point coincides with a chosen centroid: no more distinct clusters exist.
    if (total <= 0) break
    chosen.push(pickWeighted(scores, total, random))
  }

  const centroids = new Float64Array(chosen.length * 3)
  chosen.forEach((p, c) => {
    centroids[c * 3] = points[p * 3]!
    centroids[c * 3 + 1] = points[p * 3 + 1]!
    centroids[c * 3 + 2] = points[p * 3 + 2]!
  })
  return centroids
}

export function kmeans(options: KMeansOptions): KMeansResult {
  const { points, weights, maxIterations = 40, tolerance = 1e-4, seed = 1, onProgress } = options
  const n = weights.length
  if (points.length !== n * 3) throw new Error('points length must be 3 × weights length')
  if (n === 0) throw new Error('kmeans needs at least one point')
  if (options.k < 1) throw new Error('k must be >= 1')

  const random = createRandom(seed)
  const centroids = seedCentroids(points, weights, Math.min(options.k, n), random)
  const k = centroids.length / 3
  const assignments = new Uint16Array(n)
  const clusterWeights = new Float64Array(k)
  const sums = new Float64Array(k * 3)

  let iterations = 0
  for (; iterations < maxIterations; iterations++) {
    // Assignment step.
    for (let i = 0; i < n; i++) {
      let best = 0
      let bestD = Infinity
      for (let c = 0; c < k; c++) {
        const d = dist2(points, i * 3, centroids, c * 3)
        if (d < bestD) {
          bestD = d
          best = c
        }
      }
      assignments[i] = best
    }

    // Update step.
    sums.fill(0)
    clusterWeights.fill(0)
    for (let i = 0; i < n; i++) {
      const c = assignments[i]!
      const w = weights[i]!
      clusterWeights[c] = clusterWeights[c]! + w
      sums[c * 3] = sums[c * 3]! + points[i * 3]! * w
      sums[c * 3 + 1] = sums[c * 3 + 1]! + points[i * 3 + 1]! * w
      sums[c * 3 + 2] = sums[c * 3 + 2]! + points[i * 3 + 2]! * w
    }

    let maxShift = 0
    for (let c = 0; c < k; c++) {
      const w = clusterWeights[c]!
      if (w === 0) {
        // Empty cluster: re-seed it on the point that is worst served by its centroid.
        let worst = 0
        let worstScore = -1
        for (let i = 0; i < n; i++) {
          const score = dist2(points, i * 3, centroids, assignments[i]! * 3) * weights[i]!
          if (score > worstScore) {
            worstScore = score
            worst = i
          }
        }
        centroids[c * 3] = points[worst * 3]!
        centroids[c * 3 + 1] = points[worst * 3 + 1]!
        centroids[c * 3 + 2] = points[worst * 3 + 2]!
        maxShift = Infinity
        continue
      }
      const nx = sums[c * 3]! / w
      const ny = sums[c * 3 + 1]! / w
      const nz = sums[c * 3 + 2]! / w
      const dx = nx - centroids[c * 3]!
      const dy = ny - centroids[c * 3 + 1]!
      const dz = nz - centroids[c * 3 + 2]!
      maxShift = Math.max(maxShift, dx * dx + dy * dy + dz * dz)
      centroids[c * 3] = nx
      centroids[c * 3 + 1] = ny
      centroids[c * 3 + 2] = nz
    }

    onProgress?.((iterations + 1) / maxIterations)
    if (maxShift <= tolerance) {
      iterations++
      break
    }
  }

  // Final assignment against the converged centroids, with weights to match.
  clusterWeights.fill(0)
  for (let i = 0; i < n; i++) {
    let best = 0
    let bestD = Infinity
    for (let c = 0; c < k; c++) {
      const d = dist2(points, i * 3, centroids, c * 3)
      if (d < bestD) {
        bestD = d
        best = c
      }
    }
    assignments[i] = best
    clusterWeights[best] = clusterWeights[best]! + weights[i]!
  }

  onProgress?.(1)
  return { centroids, assignments, clusterWeights, iterations }
}
