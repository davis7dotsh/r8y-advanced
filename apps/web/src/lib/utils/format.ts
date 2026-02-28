export const formatCompactNumber = (value: number) =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${Math.round(value / 1_000)}K`
      : String(value)

export const formatMetric = (value: number | null) =>
  typeof value === 'number' ? value.toLocaleString() : 'N/A'

export const daysSince = (iso: string | null) => {
  if (!iso) {
    return 'N/A'
  }

  const publishedAt = new Date(iso).getTime()

  if (Number.isNaN(publishedAt)) {
    return 'N/A'
  }

  const elapsed = Math.max(0, Date.now() - publishedAt)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (elapsed < hour) {
    const minutes = Math.floor(elapsed / minute)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  if (elapsed < day) {
    const hours = Math.floor(elapsed / hour)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  const days = Math.floor(elapsed / day)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
