import { describe, expect, it } from 'vitest'
import { fitWithin, resolveMimeType, validateUpload } from './upload'

const limits = { maxFileSizeMb: 2, acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'] }

describe('validateUpload', () => {
  it('accepts supported images within the size limit', () => {
    expect(validateUpload({ name: 'a.png', type: 'image/png', size: 1000 }, limits)).toBeNull()
  })

  it('rejects unsupported types, oversized and empty files', () => {
    expect(validateUpload({ name: 'a.gif', type: 'image/gif', size: 10 }, limits)).toBe(
      'unsupported-type',
    )
    expect(
      validateUpload({ name: 'a.jpg', type: 'image/jpeg', size: 3 * 1024 * 1024 }, limits),
    ).toBe('too-large')
    expect(validateUpload({ name: 'a.jpg', type: 'image/jpeg', size: 0 }, limits)).toBe('empty')
  })

  it('falls back to the file extension when the type is missing', () => {
    expect(resolveMimeType('Photo.JPG', '')).toBe('image/jpeg')
    expect(validateUpload({ name: 'x.webp', type: '', size: 5 }, limits)).toBeNull()
    expect(validateUpload({ name: 'x.heic', type: '', size: 5 }, limits)).toBe('unsupported-type')
  })
})

describe('fitWithin', () => {
  it('scales the longer side down to the limit and keeps the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 })
    expect(fitWithin(1000, 3000, 1024)).toEqual({ width: 341, height: 1024 })
  })

  it('never upscales and never returns zero', () => {
    expect(fitWithin(300, 200, 1024)).toEqual({ width: 300, height: 200 })
    expect(fitWithin(10000, 1, 1024)).toEqual({ width: 1024, height: 1 })
  })
})
