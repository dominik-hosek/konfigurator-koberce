// Configuration state: what the customer has chosen. Derived values (price, spec) are
// computed from this with selectors and never stored.
import { limitsConfig } from '../config'

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
}

export type ConfiguratorAction =
  | { type: 'imageLoaded'; image: SourceImage }
  | { type: 'colorCountChanged'; colorCount: number }
  | { type: 'reset' }

export const initialState: ConfiguratorState = {
  image: null,
  colorCount: limitsConfig.colors.default,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function configuratorReducer(
  state: ConfiguratorState,
  action: ConfiguratorAction,
): ConfiguratorState {
  switch (action.type) {
    case 'imageLoaded':
      return { ...state, image: action.image }
    case 'colorCountChanged':
      return {
        ...state,
        colorCount: clamp(
          Math.round(action.colorCount),
          limitsConfig.colors.min,
          limitsConfig.colors.max,
        ),
      }
    case 'reset':
      return initialState
  }
}
