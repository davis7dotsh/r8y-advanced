import { Link, createFileRoute } from '@tanstack/react-router'
import { BarChart2, ThumbsUp, Youtube } from 'lucide-react'
import { ErrorState } from '@/components/error-state'
import { PaginationControls } from '@/components/pagination-controls'
import { Card, CardContent } from '@/components/ui/card'
import {
  getDavisVideos,
  type DavisVideosPayload,
} from '@/features/davis/davis.functions'
import { parseDavisListSearch } from '@/features/davis/davis-search-params'

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${Math.round(n / 1_000)}K`
      : String(n)

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
              <span className="font-medium text-violet-600">"{search.q}"</span>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {items.map((video) => (
          <Card
            key={video.videoId}
            className="overflow-hidden gap-0 py-0 transition-shadow hover:shadow-md"
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

            <CardContent className="p-4 pt-3.5">
              <Link
                to="/davis/video/$id"
                params={{ id: video.videoId }}
                search={{ commentsPage: 1 }}
                className="block truncate text-sm font-medium transition-colors hover:text-violet-600"
              >
                {video.title}
              </Link>

              <div className="mt-1.5 flex flex-wrap gap-1">
                {video.sponsors.length > 0 ? (
                  video.sponsors.map((sponsor) => (
                    <Link
                      key={sponsor.sponsorId}
                      to="/davis/sponsor/$id"
                      params={{ id: sponsor.slug }}
                      search={{ page: 1 }}
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-100 transition-colors hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-400 dark:hover:bg-violet-900/60"
                    >
                      {sponsor.name}
                    </Link>
                  ))
                ) : null}
              </div>

              <div className="mt-4 flex items-center gap-3.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BarChart2 className="size-3 shrink-0" />
                  <span className="font-medium text-foreground">
                    {fmt(video.viewCount + (video.xPost?.views ?? 0))}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <Youtube className="size-3 shrink-0" />
                  <span className="font-medium">{fmt(video.viewCount)}</span>
                </span>
                {video.xPost?.views != null ? (
                  <span className="flex items-center gap-1 text-sky-500">
                    <span className="text-[10px] font-bold leading-none">X</span>
                    <span className="font-medium">{fmt(video.xPost.views)}</span>
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <ThumbsUp className="size-3 shrink-0" />
                  <span className="font-medium text-foreground">
                    {fmt(video.likeCount)}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
