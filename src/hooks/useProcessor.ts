import { useCallback, useEffect, useRef, useState } from 'react'
import type { SourceImage } from '../state/configurator'
import type {
  ProcessingStage,
  ProcessResult,
  ProcessSettings,
  TextureResult,
  WorkerRequest,
  WorkerResponse,
} from '../workers/protocol'

export interface ProcessorState {
  status: 'idle' | 'working' | 'done' | 'error'
  stage: ProcessingStage | null
  /** Progress 0..1 within the current request. */
  progress: number
  /** Last finished result; kept while a newer request is running so the preview doesn't blink. */
  result: ProcessResult | null
  /** Tufted look of `result`; null until it has been rendered. */
  texture: TextureResult | null
  /** Progress 0..1 of the tufted look being rendered, null when idle. */
  textureProgress: number | null
  error: string | null
}

// Rough share of total time per stage, so one bar moves smoothly across stages.
const STAGE_RANGES: Record<ProcessingStage, [number, number]> = {
  background: [0, 0.1],
  histogram: [0.1, 0.2],
  clustering: [0.2, 0.45],
  smoothing: [0.45, 0.95],
  rendering: [0.95, 1],
  texture: [0, 1], // reported separately, after the flat result
}

const initial: ProcessorState = {
  status: 'idle',
  stage: null,
  progress: 0,
  result: null,
  texture: null,
  textureProgress: null,
  error: null,
}

/** Owns the processing worker and exposes its latest state. */
export function useProcessor() {
  const workerRef = useRef<Worker | null>(null)
  const sentImageId = useRef<number | null>(null)
  const latestRequest = useRef(0)
  const [state, setState] = useState<ProcessorState>(initial)

  useEffect(() => {
    const worker = new Worker(new URL('../workers/processor.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker
    sentImageId.current = null

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data
      // Ignore anything from requests that have since been superseded.
      if (msg.requestId !== latestRequest.current) return
      switch (msg.type) {
        case 'progress': {
          if (msg.stage === 'texture') {
            setState((s) => ({ ...s, textureProgress: msg.fraction }))
            break
          }
          const [from, to] = STAGE_RANGES[msg.stage]
          const progress = from + (to - from) * msg.fraction
          setState((s) => ({ ...s, stage: msg.stage, progress: Math.max(s.progress, progress) }))
          break
        }
        case 'processed':
          // The tufted look of the previous design no longer matches; it follows shortly.
          setState({
            status: 'done',
            stage: null,
            progress: 1,
            result: msg.result,
            texture: null,
            textureProgress: 0,
            error: null,
          })
          break
        case 'textured':
          setState((s) => ({ ...s, texture: msg.texture, textureProgress: null }))
          break
        case 'error':
          setState((s) => ({ ...s, status: 'error', stage: null, error: msg.message }))
          break
      }
    }
    worker.onerror = () => {
      setState((s) => ({ ...s, status: 'error', stage: null, error: 'worker-crashed' }))
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const process = useCallback((image: SourceImage, settings: ProcessSettings) => {
    const worker = workerRef.current
    if (!worker) return
    const post = (msg: WorkerRequest) => worker.postMessage(msg)

    if (sentImageId.current !== image.id) {
      // Copy (no transfer): the UI keeps its ImageData for the "original" view.
      post({
        type: 'setImage',
        imageId: image.id,
        width: image.imageData.width,
        height: image.imageData.height,
        pixels: image.imageData.data,
      })
      sentImageId.current = image.id
    }

    const requestId = ++latestRequest.current
    setState((s) => ({ ...s, status: 'working', stage: null, progress: 0, error: null }))
    post({ type: 'process', requestId, imageId: image.id, settings })
  }, [])

  return { ...state, process }
}
