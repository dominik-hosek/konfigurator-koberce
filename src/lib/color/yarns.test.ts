import { describe, expect, it } from 'vitest'
import { assignYarns, nearestYarn, prepareYarns, rankYarns } from './yarns'

const yarns = prepareYarns([
  { code: 'W', name: 'Bílá', hex: '#F5F5F0' },
  { code: 'K', name: 'Černá', hex: '#151515' },
  { code: 'R', name: 'Červená', hex: '#C8202F' },
  { code: 'B', name: 'Modrá', hex: '#2449A6' },
  { code: 'N', name: 'Námořnická', hex: '#1F2D52' },
])

describe('nearestYarn', () => {
  it('picks the perceptually closest yarn', () => {
    expect(nearestYarn([255, 255, 255], yarns).code).toBe('W')
    expect(nearestYarn([0, 0, 0], yarns).code).toBe('K')
    expect(nearestYarn([220, 30, 40], yarns).code).toBe('R')
    expect(nearestYarn([40, 70, 170], yarns).code).toBe('B')
    expect(nearestYarn([30, 40, 80], yarns).code).toBe('N')
  })

  it('throws on an empty palette', () => {
    expect(() => nearestYarn([0, 0, 0], [])).toThrow()
  })
})

describe('rankYarns', () => {
  it('sorts all yarns by ΔE, nearest first', () => {
    const ranked = rankYarns([30, 40, 80], yarns)
    expect(ranked).toHaveLength(yarns.length)
    expect(ranked[0]?.yarn.code).toBe('N')
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i]!.deltaE).toBeGreaterThanOrEqual(ranked[i - 1]!.deltaE)
    }
  })
})

describe('assignYarns', () => {
  const colors = [
    [250, 250, 250],
    [200, 30, 40],
  ] as const

  it('uses the nearest yarn by default', () => {
    expect(assignYarns(colors, yarns)).toEqual({ auto: ['W', 'R'], final: ['W', 'R'] })
  })

  it('applies valid overrides and ignores unknown codes', () => {
    const res = assignYarns(colors, yarns, { 1: 'B', 0: 'NOPE' })
    expect(res.auto).toEqual(['W', 'R'])
    expect(res.final).toEqual(['W', 'B'])
  })

  it('gives similar clusters their own yarns when a close alternative exists', () => {
    const palette = prepareYarns([
      { code: 'L', name: 'light skin', hex: '#F1D3BC' },
      { code: 'M', name: 'mid skin', hex: '#E0B08E' },
      { code: 'K', name: 'black', hex: '#151515' },
    ])
    // Both skin-ish clusters are nearest to L, but M is close enough for the second one.
    const res = assignYarns(
      [
        [240, 210, 188],
        [232, 196, 170],
      ],
      palette,
    )
    expect(new Set(res.auto).size).toBe(2)
    expect(res.auto[0]).toBe('L')
  })

  it('still shares a yarn when the only free alternative is far off', () => {
    const res = assignYarns(
      [
        [250, 250, 250],
        [245, 245, 245],
      ],
      yarns,
    )
    expect(res.auto).toEqual(['W', 'W'])
  })
})
