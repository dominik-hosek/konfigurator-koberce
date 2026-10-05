// Exact squared Euclidean distance transform (Felzenszwalb & Huttenlocher), O(n).

const INF = 1e20

interface Scratch {
  f: Float64Array
  d: Float64Array
  idx: Int32Array
  v: Int32Array
  z: Float64Array
}

function scratch(n: number): Scratch {
  return {
    f: new Float64Array(n),
    d: new Float64Array(n),
    idx: new Int32Array(n),
    v: new Int32Array(n),
    z: new Float64Array(n + 1),
  }
}

/** 1-D squared distance transform of `s.f[0..n)` into `s.d`, nearest position into `s.idx`. */
function dt1d(s: Scratch, n: number): void {
  const { f, d, idx, v, z } = s
  let k = 0
  v[0] = 0
  z[0] = -INF
  z[1] = INF
  const intersect = (q: number, vk: number) =>
    (f[q]! + q * q - (f[vk]! + vk * vk)) / (2 * q - 2 * vk)
  for (let q = 1; q < n; q++) {
    // z[0] = -INF guarantees the loop stops at k = 0.
    let sv = intersect(q, v[k]!)
    while (sv <= z[k]!) {
      k--
      sv = intersect(q, v[k]!)
    }
    k++
    v[k] = q
    z[k] = sv
    z[k + 1] = INF
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++
    const vk = v[k]!
    d[q] = (q - vk) * (q - vk) + f[vk]!
    idx[q] = vk
  }
}

export interface DistanceResult {
  /** Squared distance to the nearest site (>= INF/2 if there is no site). */
  dist2: Float64Array
  /** Pixel index of the nearest site (only if requested). */
  nearest?: Int32Array
}

/**
 * Squared Euclidean distance from every pixel to the nearest site (`sites[p] !== 0`).
 * Pixels outside the image are never sites.
 */
export function distanceTransform(
  width: number,
  height: number,
  sites: Uint8Array,
  withNearest = false,
): DistanceResult {
  const n = width * height
  const colD = new Float64Array(n)
  const colRow = withNearest ? new Int32Array(n) : null
  const s = scratch(Math.max(width, height))

  // Pass 1: columns.
  for (let x = 0; x < width; x++) {
    for (let y = 0, p = x; y < height; y++, p += width) s.f[y] = sites[p] ? 0 : INF
    dt1d(s, height)
    for (let y = 0; y < height; y++) {
      colD[y * width + x] = s.d[y]!
      if (colRow) colRow[y * width + x] = s.idx[y]!
    }
  }

  // Pass 2: rows.
  const dist2 = new Float64Array(n)
  const nearest = withNearest ? new Int32Array(n) : undefined
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) s.f[x] = colD[row + x]!
    dt1d(s, width)
    for (let x = 0; x < width; x++) {
      dist2[row + x] = s.d[x]!
      if (nearest && colRow) {
        const nx = s.idx[x]!
        nearest[row + x] = colRow[row + nx]! * width + nx
      }
    }
  }
  return { dist2, nearest }
}

export const NO_SITE_DISTANCE = INF / 2
