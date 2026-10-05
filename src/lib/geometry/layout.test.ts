import { describe, expect, it } from 'vitest'
import { computeLayout, rugAreaM2, type MotifMetrics, type ShapeSettings } from './layout'

const limits = { minWidthMm: 400, maxWidthMm: 3000, minHeightMm: 400, maxHeightMm: 3000 }

// A 1000 × 500 px photo without background.
const photo: MotifMetrics = {
  imageWidth: 1000,
  imageHeight: 500,
  hasBackground: false,
  bbox: { x0: 0, y0: 0, x1: 1000, y1: 500 },
  ellipseScale: Math.SQRT2,
  circleRadius: Math.hypot(500, 250),
}

// A 400 × 200 px motif in a 1000 × 1000 px image with background around it.
const logo: MotifMetrics = {
  imageWidth: 1000,
  imageHeight: 1000,
  hasBackground: true,
  bbox: { x0: 300, y0: 400, x1: 700, y1: 600 },
  ellipseScale: 1.2,
  circleRadius: 210,
}

const s = (o: Partial<ShapeSettings>): ShapeSettings => ({
  shape: 'rectangle',
  widthMm: 2000,
  heightMm: null,
  marginMm: 0,
  ...o,
})

describe('computeLayout – crop (no background)', () => {
  it('keeps the image aspect for a locked rectangle', () => {
    const l = computeLayout(photo, s({}), limits)
    expect(l.fit).toBe('crop')
    expect(l.heightMm).toBeCloseTo(1000)
    expect(l.pxPerMm).toBeCloseTo(0.5)
    expect(l.frame).toEqual({ x: 0, y: 0, width: 1000, height: 500 })
  })

  it('crops a centred square for a circle', () => {
    const l = computeLayout(photo, s({ shape: 'circle', widthMm: 1000 }), limits)
    expect(l.heightMm).toBe(1000)
    expect(l.frame).toEqual({ x: 250, y: 0, width: 500, height: 500 })
  })

  it('covers the requested size when unlocked', () => {
    const l = computeLayout(photo, s({ widthMm: 1000, heightMm: 1000 }), limits)
    expect(l.heightMm).toBe(1000)
    expect(l.frame).toEqual({ x: 250, y: 0, width: 500, height: 500 })
  })

  it('falls back to a rectangle for the contour shape', () => {
    expect(computeLayout(photo, s({ shape: 'contour' }), limits).shape).toBe('rectangle')
  })
})

describe('computeLayout – enclose (background removed)', () => {
  it('adds the margin around the motif bbox', () => {
    // 2000 mm wide with 100 mm margin -> 1800 mm for 400 px -> 0.222 px/mm
    const l = computeLayout(logo, s({ marginMm: 100 }), limits)
    expect(l.fit).toBe('enclose')
    expect(l.pxPerMm).toBeCloseTo(400 / 1800)
    expect(l.heightMm).toBeCloseTo(200 / (400 / 1800) + 200)
    expect(l.frame.width).toBe(444)
    expect(l.frame.x + l.frame.width / 2).toBeCloseTo(500, 0)
  })

  it('uses the motif radius for a circle', () => {
    const l = computeLayout(logo, s({ shape: 'circle', widthMm: 1000, marginMm: 50 }), limits)
    expect(l.pxPerMm).toBeCloseTo(210 / 450)
    expect(l.heightMm).toBe(1000)
  })

  it('scales the bbox ellipse for an oval', () => {
    const l = computeLayout(logo, s({ shape: 'oval', widthMm: 1200 }), limits)
    expect(l.pxPerMm).toBeCloseTo((200 * 1.2) / 600)
    expect(l.heightMm).toBeCloseTo(600)
  })

  it('fits the motif inside an unlocked size', () => {
    const l = computeLayout(logo, s({ widthMm: 1000, heightMm: 1000, marginMm: 0 }), limits)
    expect(l.widthMm).toBe(1000)
    expect(l.heightMm).toBe(1000)
    expect(l.pxPerMm).toBeCloseTo(0.4) // limited by width: 400 px / 1000 mm
  })

  it('caps the margin for small rugs', () => {
    const l = computeLayout(logo, s({ widthMm: 400, marginMm: 500 }), {
      ...limits,
      minHeightMm: 100,
    })
    expect(l.marginMm).toBe(100)
  })
})

describe('computeLayout – limits', () => {
  it('clamps the width', () => {
    const l = computeLayout(photo, s({ widthMm: 9000 }), limits)
    expect(l.widthMm).toBe(3000)
    expect(l.adjusted).toBe(true)
  })

  it('moves the width so a derived height stays within limits', () => {
    // Photo is 2:1, so 600 mm wide would be 300 mm high (< 400 mm min).
    const l = computeLayout(photo, s({ widthMm: 600 }), limits)
    expect(l.heightMm).toBeGreaterThanOrEqual(399.5)
    expect(l.widthMm).toBeCloseTo(800, 0)
    expect(l.adjusted).toBe(true)

    const tall: MotifMetrics = { ...photo, imageWidth: 500, imageHeight: 1000 }
    const t = computeLayout(tall, s({ widthMm: 2000 }), limits)
    expect(t.heightMm).toBeLessThanOrEqual(3000.5)
    expect(t.widthMm).toBeCloseTo(1500, 0)
  })

  it('does not flag an untouched size as adjusted', () => {
    expect(computeLayout(photo, s({ widthMm: 1200 }), limits).adjusted).toBe(false)
  })
})

describe('rugAreaM2', () => {
  it('computes analytic areas and contour pixel areas', () => {
    const rect = computeLayout(photo, s({ widthMm: 2000 }), limits)
    expect(rugAreaM2(rect)).toBeCloseTo(2)
    const circle = computeLayout(photo, s({ shape: 'circle', widthMm: 1000 }), limits)
    expect(rugAreaM2(circle)).toBeCloseTo(Math.PI / 4)
    const contour = computeLayout(logo, s({ shape: 'contour', widthMm: 2000 }), limits)
    // 0.2 px/mm -> 1 px = 25 mm², 40 000 px = 1 m²
    expect(rugAreaM2(contour, 40_000)).toBeCloseTo(1)
  })
})
