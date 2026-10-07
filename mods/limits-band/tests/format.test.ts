import { describe, expect, test } from 'claude-code/testing'

import { colorFor, formatShort, remainingPercent } from '../hooks/format'

describe('limits-band format', () => {
  test('durations', async () => {
    expect(formatShort((4 * 60 + 37) * 60000)).toBe('4h 37m')
    expect(formatShort(((6 * 24 + 9) * 60 + 17) * 60000)).toBe('6d 9h')
    expect(formatShort(5 * 60000)).toBe('5m')
    expect(formatShort(-1000)).toBe('0m')
  })

  test('remaining and colors', async () => {
    expect(remainingPercent(95)).toBe(5)
    expect(remainingPercent(120)).toBe(0)
    expect(colorFor(19)).toBe('error')
    expect(colorFor(20)).toBeUndefined()
  })
})
