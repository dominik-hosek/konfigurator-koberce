import { describe, expect, it } from 'vitest'
import { smoothDetails, smoothDetailsSteps } from './smoothing'

function grid(width: number, height: number, fill: number) {
  return { width, height, labels: new Uint8Array(width * height).fill(fill) }
}

function rect(
  g: { width: number; labels: Uint8Array },
  x0: number,
  y0: number,
  w: number,
  h: number,
  label: number,
) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) g.labels[y * g.width + x] = label
}

const at = (g: { width: number; labels: Uint8Array }, x: number, y: number) =>
  g.labels[y * g.width + x]

describe('smoothDetails', () => {
  it('removes lines thinner than the minimum detail', () => {
    const g = grid(40, 40, 0)
    rect(g, 5, 18, 30, 3, 1) // 3 px thick line
    const res = smoothDetails(g.labels, g.width, g.height, 3)
    expect(Array.from(res.labels).every((l) => l === 0)).toBe(true)
    expect(res.changed).toBe(90)
  })

  it('removes small islands but keeps large regions', () => {
    const g = grid(40, 40, 0)
    rect(g, 2, 2, 2, 2, 1) // tiny speck
    rect(g, 15, 15, 20, 20, 2) // big square
    const res = smoothDetails(g.labels, g.width, g.height, 3)
    const out = { width: g.width, labels: res.labels }
    expect(at(out, 2, 2)).toBe(0)
    expect(at(out, 25, 25)).toBe(2)
    expect(at(out, 16, 25)).toBe(2) // edges survive, only corners round off
  })

  it('fills thin gaps inside a region', () => {
    const g = grid(40, 40, 1)
    rect(g, 20, 0, 1, 40, 0) // 1 px gap splitting the region; touches the border
    const res = smoothDetails(g.labels, g.width, g.height, 2)
    expect(Array.from(res.labels).every((l) => l === 1)).toBe(true)
  })

  it('does not erode regions at the image border', () => {
    const g = grid(30, 30, 0)
    rect(g, 0, 0, 15, 30, 5) // left half
    const res = smoothDetails(g.labels, g.width, g.height, 4)
    expect(res.changed).toBe(0)
    expect(res.labels[0]).toBe(5)
  })

  it('is a no-op for a radius below half a pixel', () => {
    const g = grid(5, 5, 0)
    rect(g, 2, 2, 1, 1, 1)
    expect(smoothDetails(g.labels, 5, 5, 0.4).changed).toBe(0)
  })

  it('yields monotonic progress ending at 1', () => {
    const g = grid(20, 20, 0)
    rect(g, 5, 5, 8, 8, 1)
    const it = smoothDetailsSteps(g.labels, 20, 20, 2)
    const progress: number[] = []
    for (let s = it.next(); !s.done; s = it.next()) progress.push(s.value)
    expect(progress.at(-1)).toBe(1)
    expect(progress).toEqual([...progress].sort((a, b) => a - b))
  })
})
