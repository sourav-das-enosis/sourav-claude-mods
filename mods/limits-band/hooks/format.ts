export const formatShort = (ms: number): string => {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`

  return `${mins}m`
}

export const remainingPercent = (percentUsed: number): number =>
  Math.min(100, Math.max(0, Math.round(100 - percentUsed)))

export const colorFor = (remaining: number): string | undefined =>
  remaining < 20 ? 'error' : undefined
