// Typed messages between the UI thread and the processing worker.
import type { Rgb } from '../lib/color/convert'
import type { MotifMetrics, RugLayout, ShapeSettings } from '../lib/geometry/layout'
import type { BackgroundSettings, ResolvedBackgroundMode } from '../lib/image/background'

export type ProcessingStage =
  'background' | 'histogram' | 'clustering' | 'smoothing' | 'rendering' | 'texture'

/** Everything that determines the processed design. */
export interface ProcessSettings {
  colorCount: number
  background: BackgroundSettings
  /** Cluster index -> yarn code chosen by the customer. */
  yarnOverrides: Record<number, string>
  shape: ShapeSettings
  /** Yarn filling the background inside the rug; null = automatic. */
  backgroundYarn: string | null
}

export type WorkerRequest =
  | {
      type: 'setImage'
      imageId: number
      width: number
      height: number
      pixels: Uint8ClampedArray
    }
  | {
      type: 'process'
      requestId: number
      imageId: number
      settings: ProcessSettings
    }

export interface ClusterInfo {
  /** Averaged colour of the cluster in the source image. */
  color: Rgb
  /** Source pixels in this cluster (before smoothing). */
  count: number
  /** Nearest yarn by ΔE2000. */
  autoYarn: string
  /** Yarn actually used (auto or the customer's override). */
  yarn: string
}

export interface YarnUsage {
  code: string
  /** Pixels of this yarn in the final, smoothed design. */
  count: number
}

export interface BackgroundFill {
  /** Yarn suggested automatically (nearest to the removed background colour). */
  autoYarn: string
  /** Yarn actually used. */
  yarn: string
  /** Colour the suggestion is based on (for sorting the yarn picker). */
  sourceColor: Rgb
  /** True if any rug pixels are filled with it. */
  used: boolean
}

export interface ProcessResult {
  imageId: number
  settings: ProcessSettings
  /** Size of the rug grid (preview/indices), in source-image pixels. */
  width: number
  height: number
  layout: RugLayout
  motif: MotifMetrics
  /** Real rug area and width × height, in m². */
  areaM2: number
  boundingAreaM2: number
  fill: BackgroundFill
  backgroundMode: ResolvedBackgroundMode
  /** Clusters sorted by area, largest first. Indices match `settings.yarnOverrides`. */
  clusters: ClusterInfo[]
  /** Yarns in the final design, sorted by area. */
  yarns: YarnUsage[]
  /** Background pixels in the source image (removed background, before layout). */
  backgroundCount: number
  /** Index into `yarns` per rug-grid pixel; TRANSPARENT_INDEX marks pixels outside the rug. */
  indices: Uint8Array
  /** Flat preview as RGBA, ready for putImageData. */
  preview: Uint8ClampedArray
  /** Pixels changed by detail smoothing. */
  smoothedPixels: number
}

/** Tufted-look preview, rendered after the flat result of the same request. */
export interface TextureResult {
  imageId: number
  width: number
  height: number
  /** Output pixels per rug-grid pixel. */
  scale: number
  pixels: Uint8ClampedArray
}

export type WorkerResponse =
  | { type: 'progress'; requestId: number; stage: ProcessingStage; fraction: number }
  | { type: 'processed'; requestId: number; result: ProcessResult }
  | { type: 'textured'; requestId: number; texture: TextureResult }
  | { type: 'error'; requestId: number; message: string }
