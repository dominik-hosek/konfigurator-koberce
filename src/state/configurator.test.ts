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

  it('clamps the width and margin to the configured limits', () => {
    const { size, margin } = limitsConfig
    expect(reduce(initialState, { type: 'widthChanged', widthMm: 1 }).widthMm).toBe(size.minWidthMm)
    expect(reduce(initialState, { type: 'marginChanged', marginMm: 1e6 }).marginMm).toBe(
      margin.maxMm,
    )
  })

  it('unlocks and locks the aspect ratio', () => {
    const unlocked = reduce(initialState, {
      type: 'aspectLockChanged',
      locked: false,
      heightMm: 900,
    })
    expect(unlocked.heightMm).toBe(900)
    expect(reduce(unlocked, { type: 'heightChanged', heightMm: 1000 }).heightMm).toBe(1000)
    expect(
      reduce(unlocked, { type: 'aspectLockChanged', locked: true, heightMm: 0 }).heightMm,
    ).toBe(null)
    // Height cannot be set while locked.
    expect(reduce(initialState, { type: 'heightChanged', heightMm: 1000 })).toBe(initialState)
  })

  it('forces a locked aspect for circles and contours', () => {
    const unlocked = reduce(initialState, {
      type: 'aspectLockChanged',
      locked: false,
      heightMm: 900,
    })
    expect(reduce(unlocked, { type: 'shapeChanged', shape: 'oval' }).heightMm).toBe(900)
    expect(reduce(unlocked, { type: 'shapeChanged', shape: 'circle' }).heightMm).toBeNull()
    expect(reduce(unlocked, { type: 'shapeChanged', shape: 'contour' }).heightMm).toBeNull()
  })
})
