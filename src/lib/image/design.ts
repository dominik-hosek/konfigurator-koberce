// Turning per-pixel colour clusters into the final per-pixel yarn design.
import { TRANSPARENT_INDEX } from '../color/quantize'

/**
 * Maps cluster indices to yarn labels. Clusters assigned to the same yarn merge into one
 * label, so smoothing treats them as one area. Returns the label image and label -> code.
 */
export function buildYarnLayer(
  clusterIndices: Uint8Array,
  clusterYarns: readonly string[],
): { labels: Uint8Array; codes: string[] } {
  const codes: string[] = []
  const clusterToLabel = clusterYarns.map((code) => {
    let label = codes.indexOf(code)
    if (label === -1) label = codes.push(code) - 1
    return label
  })
  const labels = new Uint8Array(clusterIndices.length)
  for (let p = 0; p < labels.length; p++) {
    const c = clusterIndices[p]!
    labels[p] = c === TRANSPARENT_INDEX ? TRANSPARENT_INDEX : clusterToLabel[c]!
  }
  return { labels, codes }
}

export interface LabelSummary {
  /** Labels renumbered so yarns are sorted by area (largest first); unused yarns dropped. */
  indices: Uint8Array
  yarns: { code: string; count: number }[]
  backgroundCount: number
}

export function summarizeLabels(labels: Uint8Array, codes: readonly string[]): LabelSummary {
  const counts = new Array<number>(codes.length).fill(0)
  let backgroundCount = 0
  for (let p = 0; p < labels.length; p++) {
    const l = labels[p]!
    if (l === TRANSPARENT_INDEX) backgroundCount++
    else counts[l] = counts[l]! + 1
  }
  const order = codes
    .map((_, i) => i)
    .filter((i) => counts[i]! > 0)
    .sort((a, b) => counts[b]! - counts[a]!)
  const remap = new Uint8Array(codes.length)
  order.forEach((label, i) => (remap[label] = i))

  const indices = new Uint8Array(labels.length)
  for (let p = 0; p < labels.length; p++) {
    const l = labels[p]!
    indices[p] = l === TRANSPARENT_INDEX ? TRANSPARENT_INDEX : remap[l]!
  }
  return {
    indices,
    yarns: order.map((label) => ({ code: codes[label]!, count: counts[label]! })),
    backgroundCount,
  }
}
