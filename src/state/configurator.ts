// Configuration state: what the customer has chosen. Derived values (price, spec) are
// computed from this with selectors and never stored.
import { limitsConfig } from '../config'
import type { Rgb } from '../lib/color/convert'
import type { RugShape } from '../lib/geometry/layout'
import type { BackgroundSettings, Point } from '../lib/image/background'

export interface SourceImage {
  id: number
  fileName: string
  originalWidth: number
  originalHeight: number
  /** Downscaled working copy, used for the "original" view. */
  imageData: ImageData
}

export interface ConfiguratorState {
  image: SourceImage | null
  colorCount: number
  background: BackgroundSettings
  /** Cluster index -> yarn code. Cleared whenever clusters are recomputed. */
  yarnOverrides: Record<number, string>
  shape: RugShape
  /** Requested rug width in mm (the layout may adjust it to the limits). */
  widthMm: number
  /** Requested height in mm; null = follows the motif's aspect ratio. */
  heightMm: number | null
  /** Margin around a motif with removed background, in mm. */
  marginMm: number
  /** Yarn for the background inside the rug; null = automatic. */
  backgroundYarn: string | null
}

export const DEFAULT_BACKGROUND_TOLERANCE = 18

export type ConfiguratorAction =
  | { type: 'imageLoaded'; image: SourceImage }
  | { type: 'colorCountChanged'; colorCount: number }
  | { type: 'backgroundPicked'; color: Rgb; point: Point }
  | { type: 'backgroundDetected'; color: Rgb }
  | { type: 'backgroundToleranceChanged'; tolerance: number }
  | { type: 'backgroundContiguousChanged'; contiguous: boolean }
  | { type: 'backgroundReset' }
  | { type: 'yarnChanged'; cluster: number; code: string | null }
  | { type: 'shapeChanged'; shape: RugShape }
  | { type: 'widthChanged'; widthMm: number }
  | { type: 'heightChanged'; heightMm: number }
  /** Unlocking keeps the current height (`heightMm`) as the starting point. */
  | { type: 'aspectLockChanged'; locked: boolean; heightMm: number }
  | { type: 'marginChanged'; marginMm: number }
  | { type: 'backgroundYarnChanged'; code: string | null }
  | { type: 'reset' }

export const initialState: ConfiguratorState = {
  image: null,
  colorCount: limitsConfig.colors.default,
  background: { mode: 'auto' },
  yarnOverrides: {},
  shape: 'rectangle',
  widthMm: limitsConfig.size.defaultWidthMm,
  heightMm: null,
  marginMm: limitsConfig.margin.defaultMm,
  backgroundYarn: null,
}

const { size } = limitsConfig

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Changing the background changes the clusters, so overrides no longer apply. */
function withBackground(state: ConfiguratorState, background: BackgroundSettings) {
  return { ...state, background, yarnOverrides: {} }
}

export function configuratorReducer(
  state: ConfiguratorState,
  action: ConfiguratorAction,
): ConfiguratorState {
  const bg = state.background
  switch (action.type) {
    case 'imageLoaded':
      return {
        ...state,
        image: action.image,
        background: { mode: 'auto' },
        yarnOverrides: {},
        backgroundYarn: null,
      }

    case 'colorCountChanged': {
      const colorCount = clamp(
        Math.round(action.colorCount),
        limitsConfig.colors.min,
        limitsConfig.colors.max,
      )
      return colorCount === state.colorCount ? state : { ...state, colorCount, yarnOverrides: {} }
    }

    case 'backgroundPicked':
      return withBackground(
        state,
        bg.mode === 'color'
          ? { ...bg, colors: [...bg.colors, action.color], seeds: [...bg.seeds, action.point] }
          : {
              mode: 'color',
              colors: [action.color],
              seeds: [action.point],
              seedBorder: false,
              tolerance: DEFAULT_BACKGROUND_TOLERANCE,
              contiguous: true,
            },
      )

    case 'backgroundDetected':
      return withBackground(state, {
        mode: 'color',
        colors: [action.color],
        seeds: [],
        seedBorder: true,
        tolerance: bg.mode === 'color' ? bg.tolerance : DEFAULT_BACKGROUND_TOLERANCE,
        contiguous: bg.mode === 'color' ? bg.contiguous : true,
      })

    case 'backgroundToleranceChanged':
      return bg.mode === 'color'
        ? withBackground(state, { ...bg, tolerance: action.tolerance })
        : state

    case 'backgroundContiguousChanged':
      return bg.mode === 'color'
        ? withBackground(state, { ...bg, contiguous: action.contiguous })
        : state

    case 'backgroundReset':
      return withBackground(state, { mode: 'auto' })

    case 'yarnChanged': {
      const yarnOverrides = { ...state.yarnOverrides }
      if (action.code === null) delete yarnOverrides[action.cluster]
      else yarnOverrides[action.cluster] = action.code
      return { ...state, yarnOverrides }
    }

    case 'shapeChanged':
      // Circles and contours always follow the motif's proportions.
      return {
        ...state,
        shape: action.shape,
        heightMm: action.shape === 'rectangle' || action.shape === 'oval' ? state.heightMm : null,
      }

    case 'widthChanged':
      return { ...state, widthMm: clamp(action.widthMm, size.minWidthMm, size.maxWidthMm) }

    case 'heightChanged':
      return state.heightMm === null
        ? state
        : { ...state, heightMm: clamp(action.heightMm, size.minHeightMm, size.maxHeightMm) }

    case 'aspectLockChanged':
      return {
        ...state,
        heightMm: action.locked ? null : clamp(action.heightMm, size.minHeightMm, size.maxHeightMm),
      }

    case 'marginChanged':
      return { ...state, marginMm: clamp(action.marginMm, 0, limitsConfig.margin.maxMm) }

    case 'backgroundYarnChanged':
      return { ...state, backgroundYarn: action.code }

    case 'reset':
      return initialState
  }
}
