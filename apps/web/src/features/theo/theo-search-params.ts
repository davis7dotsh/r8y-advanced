import { normalizePage, normalizeQuery } from '@/services/theo/theo-utils'

const toObject = (value: unknown) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

export const parseTheoListSearch = (value: unknown) => {
  const search = toObject(value)
  const q = normalizeQuery(search.q)

  return {
    page: normalizePage(search.page),
    q: q.length > 0 ? q : undefined,
  }
}

export const parseTheoVideoSearch = (value: unknown) => {
  const search = toObject(value)

  return {
    commentsPage: normalizePage(search.commentsPage),
  }
}

export const parseTheoSponsorSearch = (value: unknown) => {
  const search = toObject(value)

  return {
    page: normalizePage(search.page),
  }
}
