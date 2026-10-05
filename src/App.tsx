import { useReducer, useState } from 'react'
import { ColorsPanel } from './components/ColorsPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { UploadPanel } from './components/UploadPanel'
import { Panel } from './components/ui/Panel'
import { limitsConfig, usesPlaceholderConfig } from './config'
import { useProcessor } from './hooks/useProcessor'
import { validateUpload, type UploadError } from './lib/image/upload'
import { loadImage } from './render/loadImage'
import { configuratorReducer, initialState } from './state/configurator'
import { cs } from './strings/cs'

let nextImageId = 1

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
  const processor = useProcessor()
  const { image, colorCount } = state

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
      const next = { id: nextImageId++, fileName: file.name, ...loaded }
      dispatch({ type: 'imageLoaded', image: next })
      processor.process(next, colorCount)
    } catch {
      setUploadError(uploadErrorMessage('decode-failed'))
    } finally {
      setLoading(false)
    }
  }

  function handleColorCount(count: number) {
    dispatch({ type: 'colorCountChanged', colorCount: count })
    if (image) processor.process(image, count)
  }

  const result = processor.result?.imageId === image?.id ? processor.result : null

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
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
            <div className="lg:sticky lg:top-6 lg:self-start">
              <PreviewPanel image={image} processor={processor} />
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
              <ColorsPanel
                step={2}
                colorCount={colorCount}
                palette={result?.palette ?? null}
                counts={result?.counts ?? null}
                disabled={false}
                onColorCountChange={handleColorCount}
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
