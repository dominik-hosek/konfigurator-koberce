// Rug layout: how the motif maps onto a rug of a given shape and real-world size.
//
// Two fit modes:
// - 'crop'    the image has no removed background (e.g. a photo): the shape is cut out of the
//             image (circle = centred square, oval = inscribed ellipse, unlocked = cover).
// - 'enclose' the motif has a removed background: the shape encloses the motif plus a margin;
//             background inside the rug is filled with a yarn.
//
// The result is expressed in source-image pixels (`frame`) plus the scale `pxPerMm`, so the
// worker can compose the rug grid without resampling the image.

export type RugShape = 'rectangle' | 'circle' | 'oval' | 'contour'

export interface ShapeSettings {
  shape: RugShape
  widthMm: number
  /** null = height follows the motif's aspect ratio (locked). */
  heightMm: number | null
  /** Margin around the motif (enclose mode only). */
  marginMm: number
}

export interface SizeLimits {
  minWidthMm: number
  maxWidthMm: number
  minHeightMm: number
  maxHeightMm: number
}

/** Geometry of the motif in the source image, measured by the worker. */
export interface MotifMetrics {
  imageWidth: number
  imageHeight: number
  /** True if some pixels are background (not part of the motif). */
  hasBackground: boolean
  /** Bounding box of motif pixels, [x0, x1) × [y0, y1). Whole image if there is no motif. */
  bbox: { x0: number; y0: number; x1: number; y1: number }
  /** Smallest s so that the ellipse with the bbox's half-axes × s contains the motif. */
  ellipseScale: number
  /** Radius (px) of the smallest bbox-centred circle containing the motif. */
  circleRadius: number
}

export interface RugLayout {
  shape: RugShape
  fit: 'crop' | 'enclose'
  /** Source-image pixels per millimetre of rug. */
  pxPerMm: number
  widthMm: number
  heightMm: number
  /** Effective margin (enclose mode), possibly reduced for small rugs. */
  marginMm: number
  /** Rug rectangle in source-image pixel coordinates (may extend beyond the image). */
  frame: { x: number; y: number; width: number; height: number }
  /** True if the requested size had to be changed to respect the limits. */
  adjusted: boolean
}

/** Shapes whose height may be set independently of the width. */
export function canUnlockAspect(shape: RugShape): boolean {
  return shape === 'rectangle' || shape === 'oval'
}

/** The contour shape only makes sense when there is a background to cut away. */
export function isShapeAvailable(shape: RugShape, metrics: MotifMetrics): boolean {
  return shape !== 'contour' || metrics.hasBackground
}

interface Raw {
  k: number
  widthMm: number
  heightMm: number
  marginMm: number
  cx: number
  cy: number
}

function raw(m: MotifMetrics, shape: RugShape, w: number, h: number | null, margin: number): Raw {
  const { imageWidth: W, imageHeight: H } = m
  const unlocked = h !== null && canUnlockAspect(shape)

  if (!m.hasBackground) {
    const cx = W / 2
    const cy = H / 2
    if (shape === 'circle') {
      const k = Math.min(W, H) / w
      return { k, widthMm: w, heightMm: w, marginMm: 0, cx, cy }
    }
    if (unlocked) {
      // Cover: the largest centred crop of the requested aspect ratio.
      const k = Math.min(W / w, H / h)
      return { k, widthMm: w, heightMm: h, marginMm: 0, cx, cy }
    }
    const k = W / w
    return { k, widthMm: w, heightMm: H / k, marginMm: 0, cx, cy }
  }

  const { x0, y0, x1, y1 } = m.bbox
  const bw = x1 - x0
  const bh = y1 - y0
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  // Keep the margin well below the rug size so the formulas stay positive.
  const mm = Math.max(0, Math.min(margin, w * 0.25, unlocked ? h * 0.25 : Infinity))

  switch (shape) {
    case 'circle': {
      const k = m.circleRadius / (w / 2 - mm)
      return { k, widthMm: w, heightMm: w, marginMm: mm, cx, cy }
    }
    case 'oval': {
      const a = (bw / 2) * m.ellipseScale
      const b = (bh / 2) * m.ellipseScale
      if (unlocked) {
        const k = Math.max(a / (w / 2 - mm), b / (h / 2 - mm))
        return { k, widthMm: w, heightMm: h, marginMm: mm, cx, cy }
      }
      const k = a / (w / 2 - mm)
      return { k, widthMm: w, heightMm: 2 * (b / k + mm), marginMm: mm, cx, cy }
    }
    case 'rectangle':
    case 'contour': {
      if (unlocked) {
        const k = Math.max(bw / (w - 2 * mm), bh / (h - 2 * mm))
        return { k, widthMm: w, heightMm: h, marginMm: mm, cx, cy }
      }
      const k = bw / (w - 2 * mm)
      return { k, widthMm: w, heightMm: bh / k + 2 * mm, marginMm: mm, cx, cy }
    }
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Computes the layout for the requested settings, adjusting the size to the limits.
 * With a locked aspect ratio the width is moved until the derived height fits too.
 */
export function computeLayout(
  metrics: MotifMetrics,
  settings: ShapeSettings,
  limits: SizeLimits,
): RugLayout {
  const shape = isShapeAvailable(settings.shape, metrics) ? settings.shape : 'rectangle'
  const unlocked = settings.heightMm !== null && canUnlockAspect(shape)
  const minW =
    shape === 'circle' ? Math.max(limits.minWidthMm, limits.minHeightMm) : limits.minWidthMm
  const maxW =
    shape === 'circle' ? Math.min(limits.maxWidthMm, limits.maxHeightMm) : limits.maxWidthMm

  const at = (w: number) =>
    raw(
      metrics,
      shape,
      w,
      unlocked ? clamp(settings.heightMm!, limits.minHeightMm, limits.maxHeightMm) : null,
      settings.marginMm,
    )

  let w = clamp(settings.widthMm, minW, maxW)
  let r = at(w)

  if (!unlocked) {
    // Derived height grows with width; bisect for the closest width that satisfies the limits.
    if (r.heightMm > limits.maxHeightMm + 0.5) {
      let lo = minW
      let hi = w
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2
        if (at(mid).heightMm <= limits.maxHeightMm) lo = mid
        else hi = mid
      }
      w = lo
      r = at(w)
    } else if (r.heightMm < limits.minHeightMm - 0.5) {
      let lo = w
      let hi = maxW
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2
        if (at(mid).heightMm >= limits.minHeightMm) hi = mid
        else lo = mid
      }
      w = hi
      r = at(w)
    }
  }

  const width = Math.max(1, Math.round(r.widthMm * r.k))
  const height = Math.max(1, Math.round(r.heightMm * r.k))
  return {
    shape,
    fit: metrics.hasBackground ? 'enclose' : 'crop',
    pxPerMm: r.k,
    widthMm: r.widthMm,
    heightMm: r.heightMm,
    marginMm: r.marginMm,
    frame: {
      x: Math.round(r.cx - width / 2),
      y: Math.round(r.cy - height / 2),
      width,
      height,
    },
    // Ignore sub-centimetre differences: sizes are shown in whole centimetres.
    adjusted:
      Math.abs(r.widthMm - settings.widthMm) >= 5 ||
      (unlocked && Math.abs(r.heightMm - settings.heightMm!) >= 5),
  }
}

/** Real rug area in m²: analytic for rectangle and ellipses, pixel count for the contour. */
export function rugAreaM2(layout: RugLayout, rugPixels?: number): number {
  const w = layout.widthMm / 1000
  const h = layout.heightMm / 1000
  switch (layout.shape) {
    case 'rectangle':
      return w * h
    case 'circle':
    case 'oval':
      return (Math.PI / 4) * w * h
    case 'contour':
      return rugPixels === undefined
        ? w * h
        : rugPixels / (layout.pxPerMm * layout.pxPerMm) / 1_000_000
  }
}
