// Indicative price calculation. All amounts in whole CZK.
import type { PricingConfig } from '../../config/schema'
import type { RugShape } from '../geometry/layout'

export interface PriceInput {
  shape: RugShape
  /** Real rug area (shape) in m². */
  areaM2: number
  /** Width × height in m². */
  boundingAreaM2: number
  /** Distinct yarns in the final design (including the background fill). */
  yarnCount: number
}

export interface PriceBreakdown {
  /** Area the price is based on (depends on `areaBasis`). */
  areaM2: number
  base: number
  extraColors: number
  colorSurcharge: number
  shapeSurcharge: number
  /** Sum before applying the minimum and rounding. */
  subtotal: number
  minimumApplied: boolean
  total: number
}

export function calculatePrice(input: PriceInput, pricing: PricingConfig): PriceBreakdown {
  const areaM2 = pricing.areaBasis === 'boundingBox' ? input.boundingAreaM2 : input.areaM2
  const base = areaM2 * pricing.pricePerM2
  const extraColors = Math.max(0, input.yarnCount - pricing.includedColors)
  const colorSurcharge = extraColors * pricing.pricePerExtraColor
  const shapeSurcharge = input.shape === 'contour' ? pricing.contourShapeSurcharge : 0
  const subtotal = base + colorSurcharge + shapeSurcharge
  const minimumApplied = subtotal < pricing.minimumPrice
  const raw = Math.max(subtotal, pricing.minimumPrice)
  // Round up: an indicative "from" price should not undercut the real quote.
  const total = Math.ceil(raw / pricing.roundTo - 1e-9) * pricing.roundTo
  return {
    areaM2,
    base: Math.round(base),
    extraColors,
    colorSurcharge,
    shapeSurcharge,
    subtotal: Math.round(subtotal),
    minimumApplied,
    total,
  }
}
