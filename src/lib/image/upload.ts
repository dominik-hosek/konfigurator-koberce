// Upload validation and processing-size math.

export type UploadError = 'unsupported-type' | 'too-large' | 'empty'

export interface UploadLimits {
  maxFileSizeMb: number
  acceptedTypes: readonly string[]
}

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** Resolves the MIME type, falling back to the extension (some mobile pickers send no type). */
export function resolveMimeType(name: string, type: string): string {
  if (type) return type.toLowerCase()
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPES[ext] ?? ''
}

export function validateUpload(
  file: { name: string; type: string; size: number },
  limits: UploadLimits,
): UploadError | null {
  if (file.size === 0) return 'empty'
  if (!limits.acceptedTypes.includes(resolveMimeType(file.name, file.type))) {
    return 'unsupported-type'
  }
  if (file.size > limits.maxFileSizeMb * 1024 * 1024) return 'too-large'
  return null
}

/** Scales `width`×`height` down so the longer side is at most `maxPx`. Never upscales. */
export function fitWithin(
  width: number,
  height: number,
  maxPx: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxPx / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
