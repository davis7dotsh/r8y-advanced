import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ErrorState } from '@/components/error-state'
import { PaginationControls } from '@/components/pagination-controls'
import { VideoMetrics } from '@/components/video-metrics'
import {
  getTheoSponsorDetails,
  type TheoSponsorPayload,
} from '@/features/theo/theo.functions'
import { parseTheoSponsorSearch } from '@/features/theo/theo-search-params'

export const Route = createFileRoute('/theo/sponsor/$id')({
  validateSearch: parseTheoSponsorSearch,
  loader: async ({ params, location, search }) => {
    const resolvedSearch =
      search ??
      parseTheoSponsorSearch(
        Object.fromEntries(new URLSearchParams(location?.search ?? '')),
      )

    const payload = await getTheoSponsorDetails({
      data: {
        slug: params.id,
        page: resolvedSearch.page,
        mentionsPage: resolvedSearch.mentionsPage,
      },
    })

    if (
      payload.status === 'error' &&
      payload.error.tag === 'SponsorNotFoundError'
    ) {
      throw notFound()
    }

    return payload
  },
  component: TheoSponsorRoute,
})

function TheoSponsorRoute() {
  const payload = Route.useLoaderData()
  const params = Route.useParams()
  const search = Route.useSearch()

  return (
    <TheoSponsorView
      payload={payload}
      sponsorSlug={params.id}
      page={search.page}
      mentionsPage={search.mentionsPage}
    />
  )
}

export const TheoSponsorView = ({
  payload,
  sponsorSlug,
  page: currentPage,
  mentionsPage: currentMentionsPage,
}: {
  payload: TheoSponsorPayload
  sponsorSlug: string
  page: number
  mentionsPage: number
}) => {
  if (payload.status === 'error') {
    return (
      <ErrorState
        title="Unable to load sponsor details"
        message={payload.error.message}
      />
    )
  }

  const {
    sponsor,
    stats,
    videos: {
      items,
      pagination: { page, totalPages, total },
    },
    sponsorMentions: {
      items: mentions,
      pagination: {
        page: mentionsPage,
        totalPages: mentionsTotalPages,
        total: mentionsTotal,
      },
    },
  } = payload.data

  return (
    <section className="space-y-6">
      <article className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-600">
          Sponsor
        </p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {sponsor.name}
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          Created {new Date(sponsor.createdAt).toLocaleDateString()}
        </p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-red-100 bg-red-50 p-3.5 dark:border-red-900 dark:bg-red-950">
            <dt className="text-xs font-medium uppercase tracking-wide text-red-400">
              Total YT views
            </dt>
            <dd className="mt-1 text-lg font-semibold text-red-700 dark:text-red-400">
              {stats.totalViews.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Average views
            </dt>
            <dd className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {stats.averageViews.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-lg border border-sky-100 bg-sky-50 p-3.5 dark:border-sky-900 dark:bg-sky-950">
            <dt className="text-xs font-medium uppercase tracking-wide text-sky-500">
              Total X views
            </dt>
            <dd className="mt-1 text-lg font-semibold text-sky-900 dark:text-sky-300">
              {stats.totalXViews > 0
                ? stats.totalXViews.toLocaleString()
                : 'N/A'}
            </dd>
          </div>
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Last published
            </dt>
            <dd className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {stats.lastPublishedAt
                ? `${Math.floor((Date.now() - new Date(stats.lastPublishedAt).getTime()) / 86400000)} days ago`
                : 'N/A'}
            </dd>
          </div>
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Best performing
            </dt>
            <dd className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {stats.bestPerformingVideo ? (
                <>
                  {stats.bestPerformingVideo.viewCount.toLocaleString()} &mdash;{' '}
                  {stats.bestPerformingVideo.title}
                </>
              ) : (
                'N/A'
              )}
            </dd>
          </div>
        </dl>
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Showing{' '}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{items.length}</span>{' '}
          of <span className="font-medium text-neutral-900 dark:text-neutral-100">{total}</span>{' '}
          sponsor videos
        </p>

        <PaginationControls
          page={page}
          totalPages={totalPages}
          getLink={(nextPage) => ({
            to: '/theo/sponsor/$id' as const,
            params: { id: sponsorSlug },
            search: { page: nextPage, mentionsPage: currentMentionsPage },
          })}
        />
      </div>

      <div className="grid gap-3">
        {items.map((video) => (
          <article
            key={video.videoId}
            className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-sm md:grid-cols-[200px_1fr] dark:border-neutral-700 dark:bg-neutral-900"
          >
            <Link
              to="/theo/video/$id"
              params={{ id: video.videoId }}
              search={{ commentsPage: 1 }}
              className="block overflow-hidden rounded-lg"
            >
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="h-full w-full object-cover transition duration-200 hover:scale-[1.02]"
                loading="lazy"
              />
            </Link>

            <div className="space-y-2.5">
              <Link
                to="/theo/video/$id"
                params={{ id: video.videoId }}
                search={{ commentsPage: 1 }}
                className="font-medium text-neutral-900 transition-colors hover:text-amber-700 dark:text-neutral-100 dark:hover:text-amber-400"
              >
                {video.title}
              </Link>

              <p className="text-xs text-neutral-400">
                {new Date(video.publishedAt).toLocaleString()}
              </p>

              <VideoMetrics
                viewCount={video.viewCount}
                likeCount={video.likeCount}
                commentCount={video.commentCount}
                xViews={video.xPost?.views}
              />
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Sponsor mentions
            </h3>
            <p className="mt-0.5 text-xs text-neutral-400">
              {mentionsTotal.toLocaleString()} comments mentioning this sponsor,
              sorted by most liked
            </p>
          </div>

          <PaginationControls
            page={mentionsPage}
            totalPages={mentionsTotalPages}
            getLink={(nextPage) => ({
              to: '/theo/sponsor/$id' as const,
              params: { id: sponsorSlug },
              search: { page: currentPage, mentionsPage: nextPage },
            })}
          />
        </div>

        {mentions.length === 0 ? (
          <p className="text-sm text-neutral-400">No sponsor mentions found.</p>
        ) : (
          <div className="space-y-2">
            {mentions.map((comment) => (
              <article
                key={comment.commentId}
                className="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {comment.author}
                  </span>
                  <span className="text-neutral-300 dark:text-neutral-600">&middot;</span>
                  <Link
                    to="/theo/video/$id"
                    params={{ id: comment.videoId }}
                    search={{ commentsPage: 1 }}
                    className="text-amber-600 hover:underline"
                  >
                    {comment.videoTitle}
                  </Link>
                  <span className="text-neutral-300 dark:text-neutral-600">&middot;</span>
                  <span>{new Date(comment.publishedAt).toLocaleString()}</span>
                  <span className="text-neutral-300 dark:text-neutral-600">&middot;</span>
                  <span>{comment.likeCount.toLocaleString()} likes</span>
                  <span className="text-neutral-300 dark:text-neutral-600">&middot;</span>
                  <span>{comment.replyCount.toLocaleString()} replies</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {comment.text}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
