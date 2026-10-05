// Conversions between real-world rug size and image pixels.

/** Pixels per millimetre when an image `widthPx` wide becomes a rug `widthMm` wide. */
export function pxPerMm(widthPx: number, widthMm: number): number {
  if (widthPx <= 0 || widthMm <= 0) throw new Error('Sizes must be positive')
  return widthPx / widthMm
}

/**
 * Radius in pixels of the smallest feature that can be tufted. A detail narrower than
 * `minDetailMm` is removed, so the morphological disk has half that diameter.
 */
export function detailRadiusPx(minDetailMm: number, pixelsPerMm: number): number {
  return (minDetailMm / 2) * pixelsPerMm
}
