import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import {
  getTheoVideoDetails,
  type TheoVideoPayload,
} from '@/features/theo/theo.functions'
import { parseTheoVideoSearch } from '@/features/theo/theo-search-params'

export const Route = createFileRoute('/theo/video/$id')({
  validateSearch: parseTheoVideoSearch,
  loader: async ({ params, location, search }) => {
    const resolvedSearch =
      search ??
      parseTheoVideoSearch(
        Object.fromEntries(new URLSearchParams(location?.search ?? '')),
      )

    const payload = await getTheoVideoDetails({
      data: {
        videoId: params.id,
        commentsPage: resolvedSearch.commentsPage,
      },
    })

    if (
      payload.status === 'error' &&
      payload.error.tag === 'VideoNotFoundError'
    ) {
      throw notFound()
    }

    return payload
  },
  component: TheoVideoRoute,
})

function TheoVideoRoute() {
  const payload = Route.useLoaderData()
  const params = Route.useParams()

  return <TheoVideoView payload={payload} videoId={params.id} />
}

export const TheoVideoView = ({
  payload,
  videoId,
}: {
  payload: TheoVideoPayload
  videoId: string
}) => {
  if (payload.status === 'error') {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-900">
          Unable to load video details
        </h2>
        <p className="mt-2 text-sm text-red-700">{payload.error.message}</p>
      </section>
    )
  }

  const {
    video,
    comments: {
      items,
      pagination: { page, totalPages },
    },
  } = payload.data

  return (
    <section className="space-y-6">
      <article className="grid gap-6 rounded-xl border border-neutral-200 bg-white p-5 lg:grid-cols-[320px_1fr]">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="aspect-video w-full rounded-lg object-cover"
        />

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              {video.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Published {new Date(video.publishedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-5 text-sm text-neutral-500">
            <span>
              <span className="font-semibold text-neutral-800">
                {video.viewCount.toLocaleString()}
              </span>{' '}
              views
            </span>
            <span>
              <span className="font-semibold text-neutral-800">
                {video.likeCount.toLocaleString()}
              </span>{' '}
              likes
            </span>
            <span>
              <span className="font-semibold text-neutral-800">
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
                  params={{ id: sponsor.slug }}
                  search={{ page: 1 }}
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

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
            {video.description}
          </p>
        </div>
      </article>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-neutral-900">
            Comments
          </h3>

          <div className="flex items-center gap-2 text-sm">
            {page > 1 ? (
              <Link
                to="/theo/video/$id"
                params={{ id: videoId }}
                search={{ commentsPage: page - 1 }}
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
                to="/theo/video/$id"
                params={{ id: videoId }}
                search={{ commentsPage: page + 1 }}
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

        <div className="space-y-2">
          {items.map((comment) => (
            <article
              key={comment.commentId}
              className="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5"
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                <span className="font-medium text-neutral-700">
                  {comment.author}
                </span>
                <span className="text-neutral-300">&middot;</span>
                <span>{new Date(comment.publishedAt).toLocaleString()}</span>
                <span className="text-neutral-300">&middot;</span>
                <span>{comment.likeCount.toLocaleString()} likes</span>
                <span className="text-neutral-300">&middot;</span>
                <span>{comment.replyCount.toLocaleString()} replies</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                {comment.text}
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
