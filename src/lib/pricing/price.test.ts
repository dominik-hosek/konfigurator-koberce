import { describe, expect, it } from 'vitest'
import type { PricingConfig } from '../../config/schema'
import { calculatePrice } from './price'

const pricing: PricingConfig = {
  placeholder: false,
  currency: 'CZK',
  pricePerM2: 10_000,
  includedColors: 3,
  pricePerExtraColor: 500,
  contourShapeSurcharge: 2000,
  minimumPrice: 4000,
  areaBasis: 'shape',
  roundTo: 100,
}

const input = { shape: 'rectangle' as const, areaM2: 1.5, boundingAreaM2: 1.5, yarnCount: 3 }

describe('calculatePrice', () => {
  it('multiplies area by the price per m²', () => {
    const p = calculatePrice(input, pricing)
    expect(p.base).toBe(15_000)
    expect(p.colorSurcharge).toBe(0)
    expect(p.total).toBe(15_000)
  })

  it('charges for colours above the included count', () => {
    const p = calculatePrice({ ...input, yarnCount: 6 }, pricing)
    expect(p.extraColors).toBe(3)
    expect(p.colorSurcharge).toBe(1500)
    expect(p.total).toBe(16_500)
  })

  it('adds the contour surcharge only for the contour shape', () => {
    expect(calculatePrice({ ...input, shape: 'contour' }, pricing).shapeSurcharge).toBe(2000)
    expect(calculatePrice({ ...input, shape: 'oval' }, pricing).shapeSurcharge).toBe(0)
  })

  it('applies the minimum price', () => {
    const p = calculatePrice({ ...input, areaM2: 0.1 }, pricing)
    expect(p.subtotal).toBe(1000)
    expect(p.minimumApplied).toBe(true)
    expect(p.total).toBe(4000)
  })

  it('rounds the total up to the configured step', () => {
    const p = calculatePrice({ ...input, areaM2: 1.2345 }, pricing)
    expect(p.subtotal).toBe(12_345)
    expect(p.total).toBe(12_400)
    expect(calculatePrice({ ...input, areaM2: 1.23 }, pricing).total).toBe(12_300)
  })

  it('can price shaped rugs by their bounding box', () => {
    const circle = {
      shape: 'circle' as const,
      areaM2: Math.PI / 4,
      boundingAreaM2: 1,
      yarnCount: 2,
    }
    expect(calculatePrice(circle, pricing).areaM2).toBeCloseTo(Math.PI / 4)
    expect(calculatePrice(circle, { ...pricing, areaBasis: 'boundingBox' }).areaM2).toBe(1)
  })
})
