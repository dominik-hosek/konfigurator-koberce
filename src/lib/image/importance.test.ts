import { describe, expect, it } from 'vitest'
import { detailImportance, isSkinTone } from './importance'

function image(width: number, height: number, fn: (x: number, y: number) => number) {
  const px = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = fn(x, y)
      px.set([v, v, v, 255], (y * width + x) * 4)
    }
  return px
}

describe('detailImportance', () => {
  // Left half flat grey, right half fine 2 px stripes.
  const W = 80
  const H = 40
  const px = image(W, H, (x) => (x < W / 2 ? 128 : Math.floor(x / 2) % 2 ? 0 : 255))

  it('weighs detailed areas above flat areas, within the clamp', () => {
    const w = detailImportance(px, W, H, undefined, { radiusFraction: 0.05 })
    const flat = w[20 * W + 5]!
    const busy = w[20 * W + 70]!
    expect(busy).toBeGreaterThan(flat)
    expect(flat).toBeGreaterThanOrEqual(0.25)
    expect(busy).toBeLessThanOrEqual(4)
  })

  it('gives masked pixels zero weight', () => {
    const mask = new Uint8Array(W * H)
    mask[0] = 1
    expect(detailImportance(px, W, H, mask)[0]).toBe(0)
  })

  it('returns neutral weights for a completely flat image', () => {
    const flat = image(10, 10, () => 50)
    expect(Array.from(detailImportance(flat, 10, 10)).every((v) => v === 1)).toBe(true)
  })

  it('boosts skin-toned pixels', () => {
    const px = new Uint8ClampedArray(2 * 4)
    px.set([224, 172, 150, 255], 0) // skin
    px.set([150, 180, 220, 255], 4) // sky blue
    const w = detailImportance(px, 2, 1, undefined, { skinBoost: 3 })
    expect(w[0]! / w[1]!).toBeCloseTo(3)
  })
})

describe('isSkinTone', () => {
  it('accepts a range of skin tones and rejects other colours', () => {
    for (const [r, g, b] of [
      [255, 224, 196],
      [224, 172, 150],
      [198, 134, 66],
      [141, 85, 36],
    ]) {
      expect(isSkinTone(r!, g!, b!)).toBe(true)
    }
    for (const [r, g, b] of [
      [40, 80, 200],
      [30, 160, 60],
      [128, 128, 128],
      [250, 250, 250],
      [205, 195, 185], // warm grey wall
      [10, 10, 10],
    ]) {
      expect(isSkinTone(r!, g!, b!)).toBe(false)
    }
  })
})
