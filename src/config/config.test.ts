import { describe, expect, it } from 'vitest'
import { inquiryConfig, limitsConfig, pricingConfig, yarnConfig } from './index'
import limitsJson from './limits.json'
import { ConfigError, parseLimitsConfig, parsePricingConfig, parseYarnConfig } from './schema'

describe('shipped config files', () => {
  it('parse without errors', () => {
    expect(yarnConfig.yarns.length).toBeGreaterThan(0)
    expect(pricingConfig.pricePerM2).toBeGreaterThan(0)
    expect(limitsConfig.colors.max).toBeGreaterThanOrEqual(limitsConfig.colors.min)
    expect(inquiryConfig.endpoint).toMatch(/^https:\/\//)
  })
})

describe('parseYarnConfig', () => {
  it('normalises hex to upper case', () => {
    const cfg = parseYarnConfig({ yarns: [{ code: 'A', name: 'a', hex: '#aabbcc' }] })
    expect(cfg.yarns[0]?.hex).toBe('#AABBCC')
    expect(cfg.placeholder).toBe(false)
  })

  it('rejects malformed hex and duplicate codes', () => {
    expect(() => parseYarnConfig({ yarns: [{ code: 'A', name: 'a', hex: 'red' }] })).toThrow(
      ConfigError,
    )
    expect(() =>
      parseYarnConfig({
        yarns: [
          { code: 'A', name: 'a', hex: '#000000' },
          { code: 'A', name: 'b', hex: '#FFFFFF' },
        ],
      }),
    ).toThrow(/duplicate/)
  })
})

describe('parsePricingConfig', () => {
  it('rejects negative or missing amounts', () => {
    expect(() => parsePricingConfig({ currency: 'CZK', pricePerM2: -1 })).toThrow(ConfigError)
  })
})

describe('parseLimitsConfig', () => {
  it('rejects a default colour count outside min/max', () => {
    const bad = { ...limitsJson, colors: { min: 2, max: 12, default: 20 } }
    expect(() => parseLimitsConfig(bad)).toThrow(/min <= default <= max/)
  })
})
