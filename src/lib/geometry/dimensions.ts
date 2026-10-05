// Conversions between real-world rug size and image pixels.

/** Pixels per millimetre when an image `widthPx` wide becomes a rug `widthMm` wide. */
export function pxPerMm(widthPx: number, widthMm: number): number {
  if (widthPx <= 0 || widthMm <= 0) throw new Error('Sizes must be positive')
  return widthPx / widthMm
}

/** Radius in pixels of the disk used to remove lines narrower than `minLineWidthMm`. */
export function lineRadiusPx(minLineWidthMm: number, pixelsPerMm: number): number {
  return (minLineWidthMm / 2) * pixelsPerMm
}

/** Area in pixels of a dot `minDetailMm` across: smaller isolated areas are removed. */
export function minIslandAreaPx(minDetailMm: number, pixelsPerMm: number): number {
  const r = (minDetailMm / 2) * pixelsPerMm
  return Math.PI * r * r
}
