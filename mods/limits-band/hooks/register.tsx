import type { EngineInterface, Register } from 'claude-code'

import { colorFor, formatShort, remainingPercent } from './format'

type Limit = { kind: string; percentUsed: number; resetsAt?: string }
type Sample = { limits: Limit[]; contextUsed?: number }

// Limits belong to the account, not the chat. A live reading is saved to the
// store so a chat with no reply yet can show the last one any session saw.
async function sample($: EngineInterface): Promise<Sample> {
  const usage = await $.session.usage()
  const contextUsed = usage.context.percent

  if (usage.rateLimits.length > 0) {
    await $.store.set('limits', usage.rateLimits)

    return { limits: usage.rateLimits, contextUsed }
  }

  const saved = await $.store.get('limits')

  return { limits: Array.isArray(saved) ? (saved as Limit[]) : [], contextUsed }
}

export const register: Register = on => {
  let limits: Limit[] = []
  let contextUsed: number | undefined
  let isTicking = false

  // A resumed chat has no rate-limit reading until its first reply, so an
  // empty sample must not wipe the last known one.
  const apply = (s: Sample) => {
    if (s.limits.length > 0) limits = s.limits
    if (s.contextUsed !== undefined) contextUsed = s.contextUsed
  }

  on('session.start', async ($, e, next) => {
    if (!isTicking) {
      isTicking = true
      $.clock.every(10_000, async () => {
        apply(await sample($))
        $.ui.invalidate('ui.render')
      })
    }
    apply(await sample($))
    $.ui.invalidate('ui.render')

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    $.clock.after(4_000, async () => {
      apply(await sample($))
      $.ui.invalidate('ui.render')
    })

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    apply(await sample($))
    $.ui.invalidate('ui.render')
    $.clock.after(3_000, async () => {
      apply(await sample($))
      $.ui.invalidate('ui.render')
    })

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    const { Box, Text } = $.ui.resolve(e)
    const hourly = limits.find(l => l.kind === 'five_hour')
    const weekly = limits.find(l => l.kind === 'seven_day')

    if (!hourly && !weekly && contextUsed === undefined) {
      return (
        <Box justifyContent="center" width="100%">
          <Text dimColor>Limits: waiting for first reply…</Text>
        </Box>
      )
    }

    const cell = (label: string, left: number, reset = '') => (
      <Box key={label} flexDirection="row">
        <Text bold>{label} </Text>
        <Text bold color={colorFor(left)}>
          {left}%
        </Text>
        <Text dimColor>{reset ? ` (${reset})` : ''}</Text>
      </Box>
    )

    const cells = []

    // A saved reading whose window has since reset means a fresh, full window.
    const windowCell = (label: string, l: Limit) => {
      const msLeft = l.resetsAt ? Date.parse(l.resetsAt) - Date.now() : undefined

      if (msLeft !== undefined && msLeft <= 0) return cell(label, 100)

      return cell(label, remainingPercent(l.percentUsed), msLeft === undefined ? '' : formatShort(msLeft))
    }

    if (hourly) cells.push(windowCell('Hourly Left', hourly))
    if (weekly) cells.push(windowCell('Weekly Left', weekly))

    if (contextUsed !== undefined) {
      cells.push(cell('Context Left', remainingPercent(contextUsed)))
    }

    const parts = cells.flatMap((c, i) =>
      i === 0 ? [c] : [<Text key={`dot${i}`} dimColor>{'   ·   '}</Text>, c],
    )

    return (
      <Box flexDirection="row" justifyContent="center" width="100%">
        {parts}
      </Box>
    )
  })
}
