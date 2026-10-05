import { useCallback, useEffect, useRef, useState } from 'react'
import type { SourceImage } from '../state/configurator'
import type {
  ProcessingStage,
  QuantizeResult,
  WorkerRequest,
  WorkerResponse,
} from '../workers/protocol'

export interface ProcessorState {
  status: 'idle' | 'working' | 'done' | 'error'
  stage: ProcessingStage | null
  /** Overall progress 0..1 across all stages. */
  progress: number
  /** Last finished result; kept while a newer request is running so the preview doesn't blink. */
  result: QuantizeResult | null
  error: string | null
}

const STAGE_RANGES: Record<ProcessingStage, [number, number]> = {
  histogram: [0, 0.3],
  clustering: [0.3, 0.9],
  rendering: [0.9, 1],
}

const initial: ProcessorState = {
  status: 'idle',
  stage: null,
  progress: 0,
  result: null,
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
          const [from, to] = STAGE_RANGES[msg.stage]
          setState((s) => ({ ...s, stage: msg.stage, progress: from + (to - from) * msg.fraction }))
          break
        }
        case 'quantized':
          setState({ status: 'done', stage: null, progress: 1, result: msg.result, error: null })
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

  const process = useCallback((image: SourceImage, colorCount: number) => {
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
    post({ type: 'quantize', requestId, imageId: image.id, colorCount })
  }, [])

  const reset = useCallback(() => {
    latestRequest.current++
    setState(initial)
  }, [])

  return { ...state, process, reset }
}
