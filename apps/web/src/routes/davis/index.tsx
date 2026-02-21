import { Link, createFileRoute } from '@tanstack/react-router'
import { ErrorState } from '@/components/error-state'
import { PaginationControls } from '@/components/pagination-controls'
import { VideoMetrics } from '@/components/video-metrics'
import { Card, CardContent } from '@/components/ui/card'
import {
  getDavisVideos,
  type DavisVideosPayload,
} from '@/features/davis/davis.functions'
import { parseDavisListSearch } from '@/features/davis/davis-search-params'

export const Route = createFileRoute('/davis/')({
  validateSearch: parseDavisListSearch,
  loaderDeps: ({ search }) => ({
    page: search.page,
    q: search.q,
  }),
  loader: ({ deps }) =>
    getDavisVideos({
      data: deps,
    }),
  component: DavisVideosRoute,
})

function DavisVideosRoute() {
  const payload = Route.useLoaderData()
  const search = Route.useSearch()

  return <DavisVideosView payload={payload} search={search} />
}

export const DavisVideosView = ({
  payload,
  search,
}: {
  payload: DavisVideosPayload
  search: {
    page: number
    q?: string
  }
}) => {
  if (payload.status === 'error') {
    return (
      <ErrorState
        title="Unable to load Davis videos"
        message={payload.error.message}
      />
    )
  }

  const {
    items,
    pagination: { page, totalPages, total },
  } = payload.data

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="font-medium text-foreground">{items.length}</span>{' '}
          of <span className="font-medium text-foreground">{total}</span>{' '}
          videos
          {search.q ? (
            <>
              {' '}
              for{' '}
              <span className="font-medium text-amber-700">"{search.q}"</span>
            </>
          ) : null}
        </p>

        <PaginationControls
          page={page}
          totalPages={totalPages}
          getLink={(p) => ({
            to: '/davis' as const,
            search: { page: p, q: search.q },
          })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {items.map((video) => (
          <Card
            key={video.videoId}
            className="overflow-hidden transition-shadow hover:shadow-md"
          >
            <Link
              to="/davis/video/$id"
              params={{ id: video.videoId }}
              search={{ commentsPage: 1 }}
              className="block overflow-hidden"
            >
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="aspect-video w-full object-cover transition duration-200 hover:scale-[1.02]"
                loading="lazy"
              />
            </Link>

            <CardContent className="space-y-2.5 p-3">
              <div>
                <Link
                  to="/davis/video/$id"
                  params={{ id: video.videoId }}
                  search={{ commentsPage: 1 }}
                  className="line-clamp-2 text-sm font-medium leading-snug transition-colors hover:text-amber-700"
                >
                  {video.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(video.publishedAt).toLocaleString()}
                </p>
              </div>

              <VideoMetrics
                viewCount={video.viewCount}
                likeCount={video.likeCount}
                commentCount={video.commentCount}
                xViews={video.xPost?.views}
              />

              <div className="flex flex-wrap gap-1.5">
                {video.sponsors.length > 0 ? (
                  video.sponsors.map((sponsor) => (
                    <Link
                      key={sponsor.sponsorId}
                      to="/davis/sponsor/$id"
                      params={{ id: sponsor.slug }}
                      search={{ page: 1 }}
                      className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    >
                      {sponsor.name}
                    </Link>
                  ))
                ) : (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    No sponsor
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
