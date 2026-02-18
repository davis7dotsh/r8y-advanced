import { Link, createFileRoute } from '@tanstack/react-router'
import {
  getTheoVideos,
  type TheoVideosPayload,
} from '@/features/theo/theo.functions'
import { parseTheoListSearch } from '@/features/theo/theo-search-params'

export const Route = createFileRoute('/theo/')({
  validateSearch: parseTheoListSearch,
  loaderDeps: ({ search }) => ({
    page: search.page,
    q: search.q,
  }),
  loader: ({ deps }) =>
    getTheoVideos({
      data: deps,
    }),
  component: TheoVideosRoute,
})

function TheoVideosRoute() {
  const payload = Route.useLoaderData()
  const search = Route.useSearch()

  return <TheoVideosView payload={payload} search={search} />
}

export const TheoVideosView = ({
  payload,
  search,
}: {
  payload: TheoVideosPayload
  search: {
    page: number
    q?: string
  }
}) => {
  if (payload.status === 'error') {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-900">
          Unable to load Theo videos
        </h2>
        <p className="mt-2 text-sm text-red-700">{payload.error.message}</p>
      </section>
    )
  }

  const {
    items,
    pagination: { page, totalPages, total },
  } = payload.data

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Showing{' '}
          <span className="font-medium text-neutral-900">{items.length}</span>{' '}
          of <span className="font-medium text-neutral-900">{total}</span>{' '}
          videos
          {search.q ? (
            <>
              {' '}
              for{' '}
              <span className="font-medium text-amber-700">"{search.q}"</span>
            </>
          ) : null}
        </p>

        <Pagination
          page={page}
          totalPages={totalPages}
          buildLink={(p) => ({
            to: '/theo' as const,
            search: { page: p, q: search.q },
          })}
        />
      </div>

      <div className="grid gap-3">
        {items.map((video) => (
          <article
            key={video.videoId}
            className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-sm md:grid-cols-[200px_1fr]"
          >
            <Link
              to="/theo/video/$id"
              params={{
                id: video.videoId,
              }}
              search={{
                commentsPage: 1,
              }}
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
              <div>
                <Link
                  to="/theo/video/$id"
                  params={{
                    id: video.videoId,
                  }}
                  search={{
                    commentsPage: 1,
                  }}
                  className="font-medium text-neutral-900 transition-colors hover:text-amber-700"
                >
                  {video.title}
                </Link>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {new Date(video.publishedAt).toLocaleString()}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                <span>
                  <span className="font-medium text-neutral-700">
                    {(
                      video.viewCount + (video.xPost?.views ?? 0)
                    ).toLocaleString()}
                  </span>{' '}
                  total
                </span>
                <span className="text-red-600">
                  <span className="font-medium">
                    {video.viewCount.toLocaleString()}
                  </span>{' '}
                  yt
                </span>
                {video.xPost?.views != null ? (
                  <span className="text-sky-600">
                    <span className="font-medium">
                      {video.xPost.views.toLocaleString()}
                    </span>{' '}
                    X
                  </span>
                ) : null}
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

              <div className="flex flex-wrap gap-1.5">
                {video.sponsors.length > 0 ? (
                  video.sponsors.map((sponsor) => (
                    <Link
                      key={sponsor.sponsorId}
                      to="/theo/sponsor/$id"
                      params={{
                        id: sponsor.slug,
                      }}
                      search={{
                        page: 1,
                      }}
                      className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
                    >
                      {sponsor.name}
                    </Link>
                  ))
                ) : (
                  <span className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs text-neutral-400">
                    No sponsor
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

const Pagination = ({
  page,
  totalPages,
  buildLink,
}: {
  page: number
  totalPages: number
  buildLink: (page: number) => { to: string; search: Record<string, unknown> }
}) => (
  <div className="flex items-center gap-2 text-sm">
    {page > 1 ? (
      <Link
        {...(buildLink(page - 1) as any)}
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
        {...(buildLink(page + 1) as any)}
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
)
