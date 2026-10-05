import { useState, type DragEvent } from 'react'
import { limitsConfig } from '../config'
import { cs } from '../strings/cs'
import { primaryButton, secondaryButton, textButton } from './ui/buttonStyles'

const ACCEPT = limitsConfig.upload.acceptedTypes.join(',')

interface UploadPanelProps {
  /** `hero` is the large empty-state dropzone, `compact` the replace control. */
  variant: 'hero' | 'compact'
  busy: boolean
  error: string | null
  fileInfo?: string
  onFile: (file: File) => void
}

function FileButton({
  label,
  className,
  capture,
  disabled,
  onFile,
}: {
  label: string
  className: string
  capture?: boolean
  disabled: boolean
  onFile: (file: File) => void
}) {
  return (
    <label className={`${className} ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      <input
        type="file"
        className="sr-only"
        accept={capture ? 'image/*' : ACCEPT}
        capture={capture ? 'environment' : undefined}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Reset so picking the same file again still fires a change event.
          e.target.value = ''
          if (file) onFile(file)
        }}
      />
      {label}
    </label>
  )
}

export function UploadPanel({ variant, busy, error, fileInfo, onFile }: UploadPanelProps) {
  const [dragging, setDragging] = useState(false)
  const maxMb = limitsConfig.upload.maxFileSizeMb

  const dropHandlers = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setDragging(true)
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && !busy) onFile(file)
    },
  }

  const status = (
    <div aria-live="polite" className="min-h-5 text-sm">
      {busy && <p className="text-muted">{cs.upload.loading}</p>}
      {error && !busy && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  )

  if (variant === 'compact') {
    return (
      <div
        {...dropHandlers}
        className={`rounded-xl transition-colors ${dragging ? 'bg-stone-100 ring-2 ring-stone-400' : ''}`}
      >
        {fileInfo && <p className="text-muted mb-2 truncate text-sm">{fileInfo}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <FileButton
            label={cs.upload.replace}
            className={textButton}
            disabled={busy}
            onFile={onFile}
          />
          <FileButton
            label={cs.upload.takePhoto}
            className={`${textButton} hidden pointer-coarse:inline`}
            capture
            disabled={busy}
            onFile={onFile}
          />
        </div>
        <div className="mt-2">{status}</div>
      </div>
    )
  }

  return (
    <div
      {...dropHandlers}
      className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors sm:py-20 ${
        dragging ? 'border-stone-500 bg-stone-100' : 'border-stone-300 bg-white'
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        className="mb-5 size-12 text-stone-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="6" y="10" width="36" height="28" rx="4" />
        <path d="M6 32l10-10 8 8 6-6 12 12" />
        <circle cx="31" cy="19" r="3" />
      </svg>
      <p className="text-lg font-medium">
        <span className="pointer-coarse:hidden">{cs.upload.dropTitle}</span>
        <span className="hidden pointer-coarse:inline">{cs.upload.dropTitleTouch}</span>
      </p>
      <p className="text-muted mt-1 text-sm">{cs.upload.dropHint(maxMb)}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <FileButton
          label={cs.upload.chooseFile}
          className={primaryButton}
          disabled={busy}
          onFile={onFile}
        />
        <FileButton
          label={cs.upload.takePhoto}
          className={`${secondaryButton} hidden pointer-coarse:inline-flex`}
          capture
          disabled={busy}
          onFile={onFile}
        />
      </div>
      <div className="mt-5">{status}</div>
    </div>
  )
}
