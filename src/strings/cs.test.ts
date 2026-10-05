import { describe, expect, it } from 'vitest'
import { plural } from './cs'

describe('plural', () => {
  it('follows Czech plural rules', () => {
    expect([1, 2, 4, 5, 0, 12].map((n) => plural(n, 'barva', 'barvy', 'barev'))).toEqual([
      'barva',
      'barvy',
      'barvy',
      'barev',
      'barev',
      'barev',
    ])
  })
})
