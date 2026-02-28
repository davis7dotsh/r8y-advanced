import { Result, TaggedError } from 'better-result'
import { desc, ilike, or, sql } from 'drizzle-orm'
import { sponsors, videos } from '@r8y/micky-data/schema'
import { mickyDb as defaultDb } from '@/db/micky.client.server'
import { SEARCH_SUGGESTION_LIMIT } from './micky.types'
import { normalizeQuery, toSponsorSlug } from './micky-utils'

const MAX_PER_GROUP = Math.floor(SEARCH_SUGGESTION_LIMIT / 2)

const loadSuggestionsFromDb = async (
  db: typeof defaultDb,
  input: { query: string },
) => {
  const prefix = `${input.query}%`
  const contains = `%${input.query}%`

  const [videoRows, sponsorRows] = await Promise.all([
    db
      .select({
        videoId: videos.videoId,
        title: videos.title,
      })
      .from(videos)
      .where(or(ilike(videos.title, prefix), ilike(videos.title, contains)))
      .orderBy(
        sql`case when ${videos.title} ilike ${prefix} then 0 else 1 end`,
        desc(videos.publishedAt),
      )
      .limit(MAX_PER_GROUP),
    db
      .select({
        sponsorId: sponsors.sponsorId,
        name: sponsors.name,
      })
      .from(sponsors)
      .where(or(ilike(sponsors.name, prefix), ilike(sponsors.name, contains)))
      .orderBy(
        sql`case when ${sponsors.name} ilike ${prefix} then 0 else 1 end`,
        sponsors.name,
      )
      .limit(MAX_PER_GROUP),
  ])

  return {
    videos: videoRows,
    sponsors: sponsorRows.map((sponsor) => ({
      sponsorId: sponsor.sponsorId,
      name: sponsor.name,
      slug: toSponsorSlug(sponsor.name, sponsor.sponsorId),
    })),
  }
}

export namespace MickySearchService {
  export class InvalidSearchInputError extends TaggedError(
    'InvalidSearchInputError',
  )<{
    message: string
  }>() {}

  export class SearchQueryError extends TaggedError('SearchQueryError')<{
    message: string
  }>() {}

  export const suggest = async (
    deps: {
      db?: typeof defaultDb
      queries?: {
        loadSuggestions?: (input: { query: string }) => Promise<{
          videos: {
            videoId: string
            title: string
          }[]
          sponsors: {
            sponsorId: string
            name: string
            slug: string
          }[]
        }>
      }
    },
    input: {
      q: string
    },
  ) => {
    const query = normalizeQuery(input.q)

    if (!query || query.length < 2) {
      return Result.ok({
        videos: [],
        sponsors: [],
      })
    }

    const db = deps.db ?? defaultDb
    const loadSuggestions =
      deps.queries?.loadSuggestions ??
      ((queryInput: { query: string }) => loadSuggestionsFromDb(db, queryInput))

    const result = await Result.tryPromise({
      try: () =>
        loadSuggestions({
          query,
        }),
      catch: (cause) =>
        new SearchQueryError({
          message:
            cause instanceof Error
              ? cause.message
              : 'Failed to load search suggestions',
        }),
    })

    return result
  }
}
