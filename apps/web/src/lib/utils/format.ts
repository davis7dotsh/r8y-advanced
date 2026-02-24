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

  return `${Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)} days ago`
}
