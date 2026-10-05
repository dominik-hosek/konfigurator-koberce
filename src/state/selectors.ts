// Derived values computed from the processing result; never stored in state.
import type { PricingConfig } from '../config/schema'
import { calculatePrice, type PriceBreakdown } from '../lib/pricing/price'
import type { ProcessResult } from '../workers/protocol'

export function selectPrice(
  result: ProcessResult | null,
  pricing: PricingConfig,
): PriceBreakdown | null {
  if (!result || result.yarns.length === 0) return null
  return calculatePrice(
    {
      shape: result.layout.shape,
      areaM2: result.areaM2,
      boundingAreaM2: result.boundingAreaM2,
      yarnCount: result.yarns.length,
    },
    pricing,
  )
}
