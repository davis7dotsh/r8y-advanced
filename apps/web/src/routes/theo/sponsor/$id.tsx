import { Link, createFileRoute, notFound } from '@tanstack/react-router'
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

  return <TheoSponsorView payload={payload} sponsorSlug={params.id} />
}

export const TheoSponsorView = ({
  payload,
  sponsorSlug,
}: {
  payload: TheoSponsorPayload
  sponsorSlug: string
}) => {
  if (payload.status === 'error') {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-900">
          Unable to load sponsor details
        </h2>
        <p className="mt-2 text-sm text-red-700">{payload.error.message}</p>
      </section>
    )
  }

  const {
    sponsor,
    stats,
    videos: {
      items,
      pagination: { page, totalPages, total },
    },
  } = payload.data

  return (
    <section className="space-y-6">
      <article className="rounded-xl border border-neutral-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-600">
          Sponsor
        </p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-neutral-900">
          {sponsor.name}
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          Created {new Date(sponsor.createdAt).toLocaleDateString()}
        </p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Total views
            </dt>
            <dd className="mt-1 text-lg font-semibold text-neutral-900">
              {stats.totalViews.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Average views
            </dt>
            <dd className="mt-1 text-lg font-semibold text-neutral-900">
              {stats.averageViews.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Last published
            </dt>
            <dd className="mt-1 text-sm font-semibold text-neutral-900">
              {stats.lastPublishedAt
                ? new Date(stats.lastPublishedAt).toLocaleString()
                : 'N/A'}
            </dd>
          </div>
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Best performing
            </dt>
            <dd className="mt-1 text-sm font-semibold text-neutral-900">
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
          <span className="font-medium text-neutral-900">{items.length}</span>{' '}
          of <span className="font-medium text-neutral-900">{total}</span>{' '}
          sponsor videos
        </p>

        <div className="flex items-center gap-2 text-sm">
          {page > 1 ? (
            <Link
              to="/theo/sponsor/$id"
              params={{ id: sponsorSlug }}
              search={{ page: page - 1 }}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-lg border border-neutral-100 px-3 py-1.5 text-neutral-300">
              Previous
            </span>
          )}

          <span className="text-neutral-500">
            {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              to="/theo/sponsor/$id"
              params={{ id: sponsorSlug }}
              search={{ page: page + 1 }}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-lg border border-neutral-100 px-3 py-1.5 text-neutral-300">
              Next
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        {items.map((video) => (
          <article
            key={video.videoId}
            className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-sm md:grid-cols-[200px_1fr]"
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
                className="font-medium text-neutral-900 transition-colors hover:text-amber-700"
              >
                {video.title}
              </Link>

              <p className="text-xs text-neutral-400">
                {new Date(video.publishedAt).toLocaleString()}
              </p>

              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <span>
                  <span className="font-medium text-neutral-700">
                    {video.viewCount.toLocaleString()}
                  </span>{' '}
                  views
                </span>
                <span>
                  <span className="font-medium text-neutral-700">
                    {video.likeCount.toLocaleString()}
                  </span>{' '}
                  likes
                </span>
                <span>
                  <span className="font-medium text-neutral-700">
                    {video.commentCount.toLocaleString()}
                  </span>{' '}
                  comments
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
