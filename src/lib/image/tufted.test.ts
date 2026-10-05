import { describe, expect, it } from 'vitest'
import { TRANSPARENT_INDEX as T } from '../color/quantize'
import { renderTufted, renderTuftedSteps } from './tufted'

// 60 × 40 grid: left half colour 0, right half colour 1, a 10 px cut-out strip at the bottom.
function design() {
  const width = 60
  const height = 40
  const indices = new Uint8Array(width * height)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) indices[y * width + x] = y >= 30 ? T : x < 30 ? 0 : 1
  return { indices, width, height }
}

const colors = [
  [200, 60, 40],
  [40, 80, 160],
] as const

const input = { ...design(), colors, pxPerMm: 1, maxSide: 120 }

function brightness(px: Uint8ClampedArray, i: number) {
  return px[i * 4]! + px[i * 4 + 1]! + px[i * 4 + 2]!
}

describe('renderTufted', () => {
  it('upscales to the requested size and keeps the outside transparent', () => {
    const out = renderTufted(input)
    expect(out.scale).toBe(2)
    expect(out.width).toBe(120)
    expect(out.height).toBe(80)
    // Bottom rows are outside the rug.
    expect(out.pixels[(79 * 120 + 10) * 4 + 3]).toBe(0)
    expect(out.pixels[(10 * 120 + 10) * 4 + 3]).toBe(255)
  })

  it('is deterministic', () => {
    expect(Array.from(renderTufted(input).pixels)).toEqual(Array.from(renderTufted(input).pixels))
  })

  it('keeps flat areas close to the yarn colour on average', () => {
    const out = renderTufted(input)
    let r = 0
    let n = 0
    // Interior of the left area, away from boundaries.
    for (let y = 8; y < 40; y++)
      for (let x = 8; x < 40; x++) {
        r += out.pixels[(y * out.width + x) * 4]!
        n++
      }
    expect(r / n).toBeGreaterThan(200 * 0.9)
    expect(r / n).toBeLessThan(200 * 1.1)
  })

  it('darkens the groove between two colour areas', () => {
    const out = renderTufted(input)
    let groove = 0
    let inside = 0
    for (let y = 10; y < 50; y++) {
      groove += brightness(out.pixels, y * out.width + 60) // boundary column (x = 30 in grid)
      inside += brightness(out.pixels, y * out.width + 90)
    }
    expect(groove).toBeLessThan(inside)
  })

  it('reports monotonic progress ending at 1', () => {
    const it = renderTuftedSteps(input)
    const progress: number[] = []
    for (let s = it.next(); !s.done; s = it.next()) progress.push(s.value)
    expect(progress.at(-1)).toBe(1)
    expect(progress).toEqual([...progress].sort((a, b) => a - b))
  })
})
