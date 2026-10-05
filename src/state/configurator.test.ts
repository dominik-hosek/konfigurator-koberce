import { describe, expect, it } from 'vitest'
import { limitsConfig } from '../config'
import { configuratorReducer, initialState } from './configurator'

describe('configuratorReducer', () => {
  it('clamps the colour count to configured limits', () => {
    const { min, max } = limitsConfig.colors
    const tooMany = configuratorReducer(initialState, { type: 'colorCountChanged', colorCount: 99 })
    expect(tooMany.colorCount).toBe(max)
    const tooFew = configuratorReducer(initialState, { type: 'colorCountChanged', colorCount: 0 })
    expect(tooFew.colorCount).toBe(min)
  })

  it('resets to the initial state', () => {
    const changed = configuratorReducer(initialState, { type: 'colorCountChanged', colorCount: 7 })
    expect(configuratorReducer(changed, { type: 'reset' })).toBe(initialState)
  })
})
