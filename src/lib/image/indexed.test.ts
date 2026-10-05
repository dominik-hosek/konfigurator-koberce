import { describe, expect, it } from 'vitest'
import { TRANSPARENT_INDEX } from '../color/quantize'
import { indexedToRgba } from './indexed'

describe('indexedToRgba', () => {
  it('expands indices to opaque palette colours and transparent background', () => {
    const out = indexedToRgba(new Uint8Array([1, 0, TRANSPARENT_INDEX]), [
      [10, 20, 30],
      [200, 100, 50],
    ])
    expect(Array.from(out)).toEqual([200, 100, 50, 255, 10, 20, 30, 255, 0, 0, 0, 0])
  })
})
