import { dev } from '$app/environment'
import { env as publicEnv } from '$env/dynamic/public'

export const toHref = (
  pathname: string,
  search?: Record<string, string | number | undefined | null>,
) => {
  if (!search) {
    return pathname
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    params.set(key, String(value))
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

const toNumberInRange = (
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) => {
  if (!Number.isFinite(value)) {
    return fallback
  }

  const normalized = Math.floor(value as number)
  if (normalized < min) return min
  if (normalized > max) return max
  return normalized
}

export const toVercelImageHref = (
  sourceUrl: string,
  options?: {
    width?: number
    quality?: number
  },
) => {
  if (dev || !sourceUrl) {
    return sourceUrl
  }

  const optimizeByPublicFlag =
    publicEnv.PUBLIC_VERCEL_IMAGE_OPTIMIZER === '1' ||
    publicEnv.PUBLIC_VERCEL_IMAGE_OPTIMIZER === 'true'
  const optimizeByServerRuntime =
    typeof process !== 'undefined' && process.env?.VERCEL === '1'
  const optimizeByBrowserHost =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.vercel.app')

  if (
    !optimizeByPublicFlag &&
    !optimizeByServerRuntime &&
    !optimizeByBrowserHost
  ) {
    return sourceUrl
  }

  let parsed: URL
  try {
    parsed = new URL(sourceUrl)
  } catch {
    return sourceUrl
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return sourceUrl
  }

  const width = toNumberInRange(options?.width, 640, 16, 3840)
  const quality = toNumberInRange(options?.quality, 75, 1, 100)
  const params = new URLSearchParams({
    url: sourceUrl,
    w: String(width),
    q: String(quality),
  })

  return `/_vercel/image?${params.toString()}`
}
