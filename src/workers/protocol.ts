// Typed messages between the UI thread and the processing worker.
import type { Rgb } from '../lib/color/convert'
import type { BackgroundSettings, ResolvedBackgroundMode } from '../lib/image/background'

export type ProcessingStage = 'background' | 'histogram' | 'clustering' | 'smoothing' | 'rendering'

/** Everything that determines the processed design. */
export interface ProcessSettings {
  colorCount: number
  background: BackgroundSettings
  /** Cluster index -> yarn code chosen by the customer. */
  yarnOverrides: Record<number, string>
  /** Radius (px) of the smallest tuftable detail; 0 disables smoothing. */
  detailRadiusPx: number
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

export interface ProcessResult {
  imageId: number
  settings: ProcessSettings
  width: number
  height: number
  backgroundMode: ResolvedBackgroundMode
  /** Clusters sorted by area, largest first. Indices match `settings.yarnOverrides`. */
  clusters: ClusterInfo[]
  /** Yarns in the final design, sorted by area. */
  yarns: YarnUsage[]
  /** Background pixels in the final design. */
  backgroundCount: number
  /** Index into `yarns` per pixel; TRANSPARENT_INDEX marks background. */
  indices: Uint8Array
  /** Flat preview as RGBA, ready for putImageData. */
  preview: Uint8ClampedArray
  /** Pixels changed by detail smoothing. */
  smoothedPixels: number
}

export type WorkerResponse =
  | { type: 'progress'; requestId: number; stage: ProcessingStage; fraction: number }
  | { type: 'processed'; requestId: number; result: ProcessResult }
  | { type: 'error'; requestId: number; message: string }
