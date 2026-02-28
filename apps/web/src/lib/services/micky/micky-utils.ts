import { COMMENT_PAGE_SIZE, VIDEO_PAGE_SIZE } from './micky.types'

const DEFAULT_QUERY_LIMIT = 120

export const normalizePage = (value: unknown) => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return Math.floor(parsed)
}

export const normalizeQuery = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, DEFAULT_QUERY_LIMIT)
}

export const toPagination = (input: {
  page: number
  pageSize: number
  total: number
}) => ({
  page: input.page,
  pageSize: input.pageSize,
  total: input.total,
  totalPages: Math.max(1, Math.ceil(input.total / input.pageSize)),
})

export const toOffset = (page: number, pageSize: number) =>
  (page - 1) * pageSize

export const asNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const asIsoDate = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

export const defaultVideoPagination = (page: unknown) => ({
  page: normalizePage(page),
  pageSize: VIDEO_PAGE_SIZE,
})

export const defaultCommentPagination = (page: unknown) => ({
  page: normalizePage(page),
  pageSize: COMMENT_PAGE_SIZE,
})

export const toSponsorSlug = (name: string, sponsorId: string) => {
  const slugBase = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  const safeBase = slugBase.length > 0 ? slugBase : 'sponsor'
  const suffix = sponsorId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(-4)
    .padStart(4, '0')

  return `${safeBase}--${suffix}`
}
