import { describe, expect, it } from 'vitest'
import { removeSmallIslands, smoothDetails, smoothDetailsSteps } from './smoothing'

const line = (lineRadius: number, ignoreLabel?: number) => ({
  lineRadius,
  minIslandArea: 0,
  ignoreLabel,
})

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
    const res = smoothDetails(g.labels, g.width, g.height, line(3))
    expect(Array.from(res.labels).every((l) => l === 0)).toBe(true)
    expect(res.changed).toBe(90)
  })

  it('removes small islands but keeps large regions', () => {
    const g = grid(40, 40, 0)
    rect(g, 2, 2, 2, 2, 1) // tiny speck
    rect(g, 15, 15, 20, 20, 2) // big square
    const res = smoothDetails(g.labels, g.width, g.height, line(3))
    const out = { width: g.width, labels: res.labels }
    expect(at(out, 2, 2)).toBe(0)
    expect(at(out, 25, 25)).toBe(2)
    expect(at(out, 16, 25)).toBe(2) // edges survive, only corners round off
  })

  it('fills thin gaps inside a region', () => {
    const g = grid(40, 40, 1)
    rect(g, 20, 0, 1, 40, 0) // 1 px gap splitting the region; touches the border
    const res = smoothDetails(g.labels, g.width, g.height, line(2))
    expect(Array.from(res.labels).every((l) => l === 1)).toBe(true)
  })

  it('does not erode regions at the image border', () => {
    const g = grid(30, 30, 0)
    rect(g, 0, 0, 15, 30, 5) // left half
    const res = smoothDetails(g.labels, g.width, g.height, line(4))
    expect(res.changed).toBe(0)
    expect(res.labels[0]).toBe(5)
  })

  it('is a no-op for a radius below half a pixel', () => {
    const g = grid(5, 5, 0)
    rect(g, 2, 2, 1, 1, 1)
    expect(smoothDetails(g.labels, 5, 5, line(0.4)).changed).toBe(0)
  })

  it('yields monotonic progress ending at 1', () => {
    const g = grid(20, 20, 0)
    rect(g, 5, 5, 8, 8, 1)
    const it = smoothDetailsSteps(g.labels, 20, 20, line(2))
    const progress: number[] = []
    for (let s = it.next(); !s.done; s = it.next()) progress.push(s.value)
    expect(progress.at(-1)).toBe(1)
    expect(progress).toEqual([...progress].sort((a, b) => a - b))
  })

  it('leaves the ignored label untouched and does not erode against it', () => {
    // A disk of label 1 on an ignored outside (9); thin wedges of 9 in the corners.
    const g = grid(21, 21, 9)
    for (let y = 0; y < 21; y++)
      for (let x = 0; x < 21; x++)
        if ((x - 10) ** 2 + (y - 10) ** 2 <= 100) g.labels[y * 21 + x] = 1
    const before = g.labels.slice()
    const res = smoothDetails(g.labels, 21, 21, line(3, 9))
    expect(res.changed).toBe(0)
    expect(Array.from(res.labels)).toEqual(Array.from(before))
  })

  it('never spreads the ignored label into the rug', () => {
    const g = grid(20, 20, 0)
    rect(g, 0, 0, 20, 5, 9) // outside strip
    rect(g, 5, 5, 2, 2, 1) // speck touching the outside
    const res = smoothDetails(g.labels, 20, 20, line(3, 9))
    const out = { width: 20, labels: res.labels }
    expect(at(out, 5, 5)).toBe(0)
    expect(at(out, 0, 0)).toBe(9)
  })
})

describe('removeSmallIslands', () => {
  it('absorbs small regions into the neighbour with the longest shared border', () => {
    const g = grid(10, 10, 0)
    rect(g, 0, 5, 10, 5, 1) // bottom half is label 1
    rect(g, 4, 4, 2, 2, 2) // 4 px speck straddling both halves (2 px border each... 3 vs 3)
    rect(g, 7, 1, 1, 1, 3) // 1 px speck inside label 0
    const changed = removeSmallIslands(g.labels, 10, 10, 5)
    expect(changed).toBe(5)
    expect(at(g, 7, 1)).toBe(0)
    expect([0, 1]).toContain(at(g, 4, 4))
  })

  it('keeps long thin lines whose area is large enough', () => {
    const g = grid(30, 10, 0)
    rect(g, 2, 5, 25, 1, 1) // 1 px wide, 25 px long
    expect(removeSmallIslands(g.labels, 30, 10, 20)).toBe(0)
    expect(at(g, 10, 5)).toBe(1)
  })

  it('never merges into the ignored label', () => {
    const g = grid(6, 6, 9)
    rect(g, 2, 2, 1, 1, 1)
    expect(removeSmallIslands(g.labels, 6, 6, 4, 9)).toBe(0)
  })
})

describe('smoothDetails with both passes', () => {
  it('keeps a narrow but long feature that the line pass allows', () => {
    const g = grid(40, 40, 0)
    rect(g, 5, 20, 30, 3, 1) // 3 px thick line
    rect(g, 10, 5, 2, 2, 2) // tiny dot
    const res = smoothDetails(g.labels, 40, 40, { lineRadius: 1, minIslandArea: 20 })
    const out = { width: 40, labels: res.labels }
    expect(at(out, 20, 21)).toBe(1)
    expect(at(out, 10, 5)).toBe(0)
  })
})
