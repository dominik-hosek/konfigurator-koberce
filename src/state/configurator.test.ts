import { describe, expect, it } from 'vitest'
import { limitsConfig } from '../config'
import {
  configuratorReducer as reduce,
  DEFAULT_BACKGROUND_TOLERANCE,
  initialState,
  type ConfiguratorState,
} from './configurator'

describe('configuratorReducer', () => {
  it('clamps the colour count to configured limits', () => {
    const { min, max } = limitsConfig.colors
    expect(reduce(initialState, { type: 'colorCountChanged', colorCount: 99 }).colorCount).toBe(max)
    expect(reduce(initialState, { type: 'colorCountChanged', colorCount: 0 }).colorCount).toBe(min)
  })

  it('clears yarn overrides when the clusters change', () => {
    const withOverride = reduce(initialState, { type: 'yarnChanged', cluster: 1, code: 'Y-009' })
    expect(withOverride.yarnOverrides).toEqual({ 1: 'Y-009' })
    const changed = reduce(withOverride, {
      type: 'colorCountChanged',
      colorCount: initialState.colorCount + 1,
    })
    expect(changed.yarnOverrides).toEqual({})
    expect(reduce(withOverride, { type: 'backgroundReset' }).yarnOverrides).toEqual({})
  })

  it('removes an override when the code is null', () => {
    const s = reduce(initialState, { type: 'yarnChanged', cluster: 0, code: 'A' })
    expect(reduce(s, { type: 'yarnChanged', cluster: 0, code: null }).yarnOverrides).toEqual({})
  })

  it('accumulates picked background colours', () => {
    let s: ConfiguratorState = reduce(initialState, {
      type: 'backgroundPicked',
      color: [255, 255, 255],
      point: { x: 1, y: 2 },
    })
    s = reduce(s, { type: 'backgroundPicked', color: [0, 0, 0], point: { x: 3, y: 4 } })
    expect(s.background).toEqual({
      mode: 'color',
      colors: [
        [255, 255, 255],
        [0, 0, 0],
      ],
      seeds: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
      seedBorder: false,
      tolerance: DEFAULT_BACKGROUND_TOLERANCE,
      contiguous: true,
    })
  })

  it('only adjusts tolerance in colour mode', () => {
    expect(reduce(initialState, { type: 'backgroundToleranceChanged', tolerance: 5 })).toBe(
      initialState,
    )
    const s = reduce(initialState, { type: 'backgroundDetected', color: [1, 2, 3] })
    const t = reduce(s, { type: 'backgroundToleranceChanged', tolerance: 5 })
    expect(t.background).toMatchObject({ mode: 'color', seedBorder: true, tolerance: 5 })
  })

  it('resets to the initial state', () => {
    const changed = reduce(initialState, { type: 'colorCountChanged', colorCount: 7 })
    expect(reduce(changed, { type: 'reset' })).toBe(initialState)
  })
})
