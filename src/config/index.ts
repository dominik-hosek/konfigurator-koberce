// Single typed entry point for all business configuration.
// Edit the JSON files next to this module; never hardcode these values elsewhere.
import inquiryJson from './inquiry.json'
import limitsJson from './limits.json'
import pricingJson from './pricing.json'
import yarnsJson from './yarns.json'
import {
  parseInquiryConfig,
  parseLimitsConfig,
  parsePricingConfig,
  parseYarnConfig,
} from './schema'

export type { InquiryConfig, LimitsConfig, PricingConfig, Yarn, YarnConfig } from './schema'

export const yarnConfig = parseYarnConfig(yarnsJson)
export const pricingConfig = parsePricingConfig(pricingJson)
export const limitsConfig = parseLimitsConfig(limitsJson)
export const inquiryConfig = parseInquiryConfig(inquiryJson)

/** True while any config file still holds placeholder values. */
export const usesPlaceholderConfig = [yarnConfig, pricingConfig, limitsConfig, inquiryConfig].some(
  (c) => c.placeholder,
)
