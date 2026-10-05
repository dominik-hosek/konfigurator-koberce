// Types and runtime validation for the JSON config files in this folder.
// Validation runs once at startup so a typo in a JSON file fails loudly instead of
// producing silently wrong prices or colours.

export interface Yarn {
  code: string
  name: string
  hex: string
}

export interface YarnConfig {
  placeholder: boolean
  yarns: Yarn[]
}

export interface PricingConfig {
  placeholder: boolean
  currency: string
  pricePerM2: number
  includedColors: number
  pricePerExtraColor: number
  contourShapeSurcharge: number
  minimumPrice: number
  areaBasis: 'shape' | 'boundingBox'
  roundTo: number
}

export interface LimitsConfig {
  placeholder: boolean
  upload: {
    maxFileSizeMb: number
    acceptedTypes: string[]
    processingMaxPx: number
  }
  colors: {
    min: number
    max: number
    default: number
  }
  size: {
    minWidthMm: number
    maxWidthMm: number
    minHeightMm: number
    maxHeightMm: number
    defaultWidthMm: number
  }
  margin: {
    defaultMm: number
    maxMm: number
  }
  minDetailMm: number
}

export interface InquiryConfig {
  placeholder: boolean
  endpoint: string
}

export class ConfigError extends Error {
  constructor(file: string, message: string) {
    super(`Invalid config ${file}: ${message}`)
    this.name = 'ConfigError'
  }
}

type Json = Record<string, unknown>

function obj(file: string, value: unknown, path: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ConfigError(file, `${path} must be an object`)
  }
  return value as Json
}

function num(file: string, o: Json, key: string, path = key, min = 0): number {
  const v = o[key]
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min) {
    throw new ConfigError(file, `${path} must be a number >= ${min}`)
  }
  return v
}

function str(file: string, o: Json, key: string, path = key): string {
  const v = o[key]
  if (typeof v !== 'string' || v.trim() === '') {
    throw new ConfigError(file, `${path} must be a non-empty string`)
  }
  return v
}

function placeholder(o: Json): boolean {
  return o._placeholder === true
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function parseYarnConfig(raw: unknown): YarnConfig {
  const file = 'yarns.json'
  const o = obj(file, raw, 'root')
  if (!Array.isArray(o.yarns) || o.yarns.length === 0) {
    throw new ConfigError(file, 'yarns must be a non-empty array')
  }
  const seen = new Set<string>()
  const yarns = o.yarns.map((item, i) => {
    const y = obj(file, item, `yarns[${i}]`)
    const code = str(file, y, 'code', `yarns[${i}].code`)
    const name = str(file, y, 'name', `yarns[${i}].name`)
    const hex = str(file, y, 'hex', `yarns[${i}].hex`)
    if (!HEX_RE.test(hex)) throw new ConfigError(file, `yarns[${i}].hex must look like #RRGGBB`)
    if (seen.has(code)) throw new ConfigError(file, `duplicate yarn code ${code}`)
    seen.add(code)
    return { code, name, hex: hex.toUpperCase() }
  })
  return { placeholder: placeholder(o), yarns }
}

export function parsePricingConfig(raw: unknown): PricingConfig {
  const file = 'pricing.json'
  const o = obj(file, raw, 'root')
  return {
    placeholder: placeholder(o),
    currency: str(file, o, 'currency'),
    pricePerM2: num(file, o, 'pricePerM2'),
    includedColors: num(file, o, 'includedColors'),
    pricePerExtraColor: num(file, o, 'pricePerExtraColor'),
    contourShapeSurcharge: num(file, o, 'contourShapeSurcharge'),
    minimumPrice: num(file, o, 'minimumPrice'),
    areaBasis: areaBasis(file, o),
    roundTo: num(file, o, 'roundTo', 'roundTo', 1),
  }
}

function areaBasis(file: string, o: Json): PricingConfig['areaBasis'] {
  const v = o.areaBasis
  if (v !== 'shape' && v !== 'boundingBox') {
    throw new ConfigError(file, 'areaBasis must be "shape" or "boundingBox"')
  }
  return v
}

export function parseLimitsConfig(raw: unknown): LimitsConfig {
  const file = 'limits.json'
  const o = obj(file, raw, 'root')
  const upload = obj(file, o.upload, 'upload')
  const colors = obj(file, o.colors, 'colors')
  const size = obj(file, o.size, 'size')
  const margin = obj(file, o.margin, 'margin')

  if (
    !Array.isArray(upload.acceptedTypes) ||
    upload.acceptedTypes.length === 0 ||
    !upload.acceptedTypes.every((t) => typeof t === 'string')
  ) {
    throw new ConfigError(file, 'upload.acceptedTypes must be a non-empty array of MIME types')
  }

  const result: LimitsConfig = {
    placeholder: placeholder(o),
    upload: {
      maxFileSizeMb: num(file, upload, 'maxFileSizeMb', 'upload.maxFileSizeMb', 0.1),
      acceptedTypes: upload.acceptedTypes as string[],
      processingMaxPx: num(file, upload, 'processingMaxPx', 'upload.processingMaxPx', 64),
    },
    colors: {
      min: num(file, colors, 'min', 'colors.min', 1),
      max: num(file, colors, 'max', 'colors.max', 1),
      default: num(file, colors, 'default', 'colors.default', 1),
    },
    size: {
      minWidthMm: num(file, size, 'minWidthMm', 'size.minWidthMm', 1),
      maxWidthMm: num(file, size, 'maxWidthMm', 'size.maxWidthMm', 1),
      minHeightMm: num(file, size, 'minHeightMm', 'size.minHeightMm', 1),
      maxHeightMm: num(file, size, 'maxHeightMm', 'size.maxHeightMm', 1),
      defaultWidthMm: num(file, size, 'defaultWidthMm', 'size.defaultWidthMm', 1),
    },
    margin: {
      defaultMm: num(file, margin, 'defaultMm', 'margin.defaultMm', 0),
      maxMm: num(file, margin, 'maxMm', 'margin.maxMm', 0),
    },
    minDetailMm: num(file, o, 'minDetailMm', 'minDetailMm', 0),
  }

  const { colors: c, size: s } = result
  if (c.max > 254) throw new ConfigError(file, 'colors.max must be <= 254')
  if (!(c.min <= c.default && c.default <= c.max)) {
    throw new ConfigError(file, 'colors must satisfy min <= default <= max')
  }
  if (s.minWidthMm > s.maxWidthMm || s.minHeightMm > s.maxHeightMm) {
    throw new ConfigError(file, 'size minimums must not exceed maximums')
  }
  if (s.defaultWidthMm < s.minWidthMm || s.defaultWidthMm > s.maxWidthMm) {
    throw new ConfigError(file, 'size.defaultWidthMm must lie within min/max width')
  }
  if (result.margin.defaultMm > result.margin.maxMm) {
    throw new ConfigError(file, 'margin.defaultMm must not exceed margin.maxMm')
  }
  return result
}

export function parseInquiryConfig(raw: unknown): InquiryConfig {
  const file = 'inquiry.json'
  const o = obj(file, raw, 'root')
  const endpoint = str(file, o, 'endpoint')
  if (!/^https:\/\//.test(endpoint)) throw new ConfigError(file, 'endpoint must be an https URL')
  return { placeholder: placeholder(o), endpoint }
}
