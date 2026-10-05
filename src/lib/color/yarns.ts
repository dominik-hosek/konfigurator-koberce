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
 * Assigns a yarn to every cluster colour. `overrides` maps cluster index -> yarn code;
 * unknown codes are ignored so a stale override can never produce an invalid design.
 */
export function assignYarns(
  clusterColors: readonly Rgb[],
  yarns: readonly PreparedYarn[],
  overrides: Readonly<Record<number, string>> = {},
): YarnAssignment {
  const known = new Set(yarns.map((y) => y.code))
  const auto = clusterColors.map((c) => nearestYarn(c, yarns).code)
  const final = auto.map((code, i) => {
    const o = overrides[i]
    return o !== undefined && known.has(o) ? o : code
  })
  return { auto, final }
}
