// Mapping design colours onto the physical yarn palette.
import type { Yarn } from '../../config/schema'
import { hexToRgb, rgbToLab, type Lab, type Rgb } from './convert'
import { deltaE2000 } from './deltaE'

export interface PreparedYarn extends Yarn {
  rgb: Rgb
  lab: Lab
}

export function prepareYarns(yarns: readonly Yarn[]): PreparedYarn[] {
  return yarns.map((y) => {
    const rgb = hexToRgb(y.hex)
    return { ...y, rgb, lab: rgbToLab(rgb) }
  })
}

export interface RankedYarn {
  yarn: PreparedYarn
  deltaE: number
}

/** All yarns sorted from the closest to the furthest match for `color`. */
export function rankYarns(color: Rgb, yarns: readonly PreparedYarn[]): RankedYarn[] {
  const lab = rgbToLab(color)
  return yarns
    .map((yarn) => ({ yarn, deltaE: deltaE2000(lab, yarn.lab) }))
    .sort((a, b) => a.deltaE - b.deltaE)
}

export function nearestYarn(color: Rgb, yarns: readonly PreparedYarn[]): PreparedYarn {
  if (yarns.length === 0) throw new Error('Yarn palette is empty')
  const lab = rgbToLab(color)
  let best = yarns[0]!
  let bestD = Infinity
  for (const yarn of yarns) {
    const d = deltaE2000(lab, yarn.lab)
    if (d < bestD) {
      bestD = d
      best = yarn
    }
  }
  return best
}

export interface YarnAssignment {
  /** Automatically chosen yarn code per cluster. */
  auto: string[]
  /** Final yarn code per cluster (auto unless overridden). */
  final: string[]
}

/**
 * How much worse (ΔE2000) than its nearest yarn a cluster may get so that it keeps its own
 * yarn instead of sharing one with a similar cluster. Sharing merges the two areas and loses
 * shading (e.g. light and dark skin tones collapsing into one).
 */
export const DISTINCT_YARN_TOLERANCE = 12

/**
 * Assigns a yarn to every cluster colour, preferring a different yarn for each cluster.
 * Pairs are matched greedily from the closest (cluster, yarn) pair up; a cluster whose best
 * free yarn is much worse than its nearest one shares the nearest yarn instead.
 * `overrides` maps cluster index -> yarn code; unknown codes are ignored so a stale override
 * can never produce an invalid design.
 */
export function assignYarns(
  clusterColors: readonly Rgb[],
  yarns: readonly PreparedYarn[],
  overrides: Readonly<Record<number, string>> = {},
): YarnAssignment {
  if (yarns.length === 0) throw new Error('Yarn palette is empty')
  const known = new Set(yarns.map((y) => y.code))
  const distances = clusterColors.map((c) => {
    const lab = rgbToLab(c)
    return yarns.map((y) => deltaE2000(lab, y.lab))
  })

  const pairs: { c: number; y: number; d: number }[] = []
  distances.forEach((row, c) => row.forEach((d, y) => pairs.push({ c, y, d })))
  pairs.sort((a, b) => a.d - b.d)

  const nearest = distances.map((row) => row.indexOf(Math.min(...row)))
  const chosen = new Array<number>(clusterColors.length).fill(-1)
  const used = new Set<number>()
  for (const { c, y, d } of pairs) {
    if (chosen[c] !== -1 || used.has(y)) continue
    if (d - distances[c]![nearest[c]!]! > DISTINCT_YARN_TOLERANCE) continue
    chosen[c] = y
    used.add(y)
  }

  const auto = chosen.map((y, c) => yarns[y === -1 ? nearest[c]! : y]!.code)
  const final = auto.map((code, i) => {
    const o = overrides[i]
    return o !== undefined && known.has(o) ? o : code
  })
  return { auto, final }
}
