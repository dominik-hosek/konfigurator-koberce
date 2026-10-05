import { describe, expect, it } from 'vitest'
import { TRANSPARENT_INDEX as T } from '../color/quantize'
import { buildYarnLayer, summarizeLabels } from './design'

describe('buildYarnLayer', () => {
  it('merges clusters that use the same yarn', () => {
    const { labels, codes } = buildYarnLayer(new Uint8Array([0, 1, 2, T, 1]), ['A', 'B', 'A'])
    expect(codes).toEqual(['A', 'B'])
    expect(Array.from(labels)).toEqual([0, 1, 0, T, 1])
  })
})

describe('summarizeLabels', () => {
  it('sorts yarns by area, drops unused ones and counts background', () => {
    const res = summarizeLabels(new Uint8Array([0, 2, 2, T, 2, 0, T]), ['A', 'B', 'C'])
    expect(res.yarns).toEqual([
      { code: 'C', count: 3 },
      { code: 'A', count: 2 },
    ])
    expect(res.backgroundCount).toBe(2)
    expect(Array.from(res.indices)).toEqual([1, 0, 0, T, 0, 1, T])
  })
})
