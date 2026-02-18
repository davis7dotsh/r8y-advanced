import { normalizePage, normalizeQuery } from '@/services/theo/theo-utils'

const toObject = (value: unknown) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

export const COMMENTS_SORT_VALUES = ['likeCount', 'publishedAt'] as const
export type CommentsSort = (typeof COMMENTS_SORT_VALUES)[number]

export const COMMENTS_FILTER_VALUES = [
  'all',
  'isQuestion',
  'isPositiveComment',
  'isSponsorMention',
  'isEditingMistake',
] as const
export type CommentsFilter = (typeof COMMENTS_FILTER_VALUES)[number]

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

  const commentsSort: CommentsSort = COMMENTS_SORT_VALUES.includes(
    search.commentsSort as CommentsSort,
  )
    ? (search.commentsSort as CommentsSort)
    : 'likeCount'

  const commentsFilter: CommentsFilter = COMMENTS_FILTER_VALUES.includes(
    search.commentsFilter as CommentsFilter,
  )
    ? (search.commentsFilter as CommentsFilter)
    : 'all'

  return {
    commentsPage: normalizePage(search.commentsPage),
    commentsSort,
    commentsFilter,
  }
}

export const parseTheoSponsorSearch = (value: unknown) => {
  const search = toObject(value)

  return {
    page: normalizePage(search.page),
    mentionsPage: normalizePage(search.mentionsPage),
  }
}
