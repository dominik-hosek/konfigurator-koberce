import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { BackgroundPanel } from './components/BackgroundPanel'
import { ColorsPanel } from './components/ColorsPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { UploadPanel } from './components/UploadPanel'
import { Panel } from './components/ui/Panel'
import { limitsConfig, usesPlaceholderConfig, yarnConfig } from './config'
import { useProcessor } from './hooks/useProcessor'
import { prepareYarns } from './lib/color/yarns'
import { detailRadiusPx } from './lib/geometry/dimensions'
import { dominantBorderColor, sampleColor } from './lib/image/background'
import { validateUpload, type UploadError } from './lib/image/upload'
import { loadImage } from './render/loadImage'
import { configuratorReducer, initialState } from './state/configurator'
import { cs } from './strings/cs'
import type { ProcessSettings } from './workers/protocol'

let nextImageId = 1
const yarns = prepareYarns(yarnConfig.yarns)

function uploadErrorMessage(error: UploadError | 'decode-failed'): string {
  const messages = cs.upload.errors
  return error === 'too-large'
    ? messages['too-large'](limitsConfig.upload.maxFileSizeMb)
    : messages[error]
}

export default function App() {
  const [state, dispatch] = useReducer(configuratorReducer, initialState)
  const [loading, setLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [detectFailed, setDetectFailed] = useState(false)
  const processor = useProcessor()
  const { process } = processor
  const { image, colorCount, background, yarnOverrides, widthMm } = state

  const settings = useMemo<ProcessSettings | null>(
    () =>
      image && {
        colorCount,
        background,
        yarnOverrides,
        detailRadiusPx: detailRadiusPx(limitsConfig.minDetailMm, image.imageData.width, widthMm),
      },
    [image, colorCount, background, yarnOverrides, widthMm],
  )

  // Re-process whenever anything that affects the design changes.
  useEffect(() => {
    if (image && settings) process(image, settings)
  }, [image, settings, process])

  async function handleFile(file: File) {
    const invalid = validateUpload(file, limitsConfig.upload)
    if (invalid) {
      setUploadError(uploadErrorMessage(invalid))
      return
    }
    setUploadError(null)
    setLoading(true)
    try {
      const loaded = await loadImage(file, limitsConfig.upload.processingMaxPx)
      setPicking(false)
      setDetectFailed(false)
      dispatch({
        type: 'imageLoaded',
        image: { id: nextImageId++, fileName: file.name, ...loaded },
      })
    } catch {
      setUploadError(uploadErrorMessage('decode-failed'))
    } finally {
      setLoading(false)
    }
  }

  function handlePick(x: number, y: number) {
    if (!image) return
    const { data, width, height } = image.imageData
    const color = sampleColor(data, width, height, x, y)
    setPicking(false)
    setDetectFailed(false)
    if (color) dispatch({ type: 'backgroundPicked', color, point: { x, y } })
  }

  function handleDetect() {
    if (!image) return
    const { data, width, height } = image.imageData
    const found = dominantBorderColor(data, width, height)
    setPicking(false)
    setDetectFailed(!found)
    if (found) dispatch({ type: 'backgroundDetected', color: found.color })
  }

  const cancelPick = useCallback(() => setPicking(false), [])

  const result = processor.result?.imageId === image?.id ? processor.result : null
  const removedPercent =
    result && background.mode === 'color'
      ? (result.backgroundCount / (result.width * result.height)) * 100
      : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-2xl sm:mb-12">
        <p className="text-muted mb-3 text-xs font-semibold tracking-[0.2em] uppercase">URUG</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {cs.app.title}
        </h1>
        <p className="text-muted mt-3 text-pretty">{cs.app.lead}</p>
      </header>

      <main>
        {!image ? (
          <UploadPanel variant="hero" busy={loading} error={uploadError} onFile={handleFile} />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
            <div className="lg:sticky lg:top-6 lg:self-start">
              <PreviewPanel
                image={image}
                processor={processor}
                picking={picking}
                onPick={handlePick}
                onCancelPick={cancelPick}
              />
            </div>

            <div className="flex flex-col gap-8">
              <Panel step={1} title={cs.steps.image}>
                <UploadPanel
                  variant="compact"
                  busy={loading}
                  error={uploadError}
                  fileInfo={cs.upload.loaded(
                    image.fileName,
                    image.originalWidth,
                    image.originalHeight,
                  )}
                  onFile={handleFile}
                />
              </Panel>
              <BackgroundPanel
                step={2}
                settings={background}
                resolvedMode={result?.backgroundMode ?? null}
                removedPercent={removedPercent}
                picking={picking}
                detectFailed={detectFailed}
                onTogglePicking={() => setPicking((p) => !p)}
                onDetect={handleDetect}
                onReset={() => {
                  setDetectFailed(false)
                  dispatch({ type: 'backgroundReset' })
                }}
                onToleranceChange={(tolerance) =>
                  dispatch({ type: 'backgroundToleranceChanged', tolerance })
                }
                onEnclosedChange={(enclosed) =>
                  dispatch({ type: 'backgroundContiguousChanged', contiguous: !enclosed })
                }
              />
              <ColorsPanel
                step={3}
                colorCount={colorCount}
                result={result}
                yarns={yarns}
                widthMm={widthMm}
                onColorCountChange={(count) =>
                  dispatch({ type: 'colorCountChanged', colorCount: count })
                }
                onYarnChange={(cluster, code) => dispatch({ type: 'yarnChanged', cluster, code })}
              />
            </div>
          </div>
        )}
      </main>

      {usesPlaceholderConfig && (
        <footer className="text-muted mt-16 text-xs">{cs.app.placeholderNotice}</footer>
      )}
    </div>
  )
}
