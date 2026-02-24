import React from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ErrorState } from '@/components/error-state'
import { PaginationControls } from '@/components/pagination-controls'
import { VideoMetrics } from '@/components/video-metrics'
import {
  getDavisVideoDetails,
  linkDavisVideoToXPost,
  type DavisVideoPayload,
} from '@/features/davis/davis.functions'
import {
  parseDavisVideoSearch,
  type CommentsFilter,
  type CommentsSort,
} from '@/features/davis/davis-search-params'

export const Route = createFileRoute('/davis/video/$id')({
  validateSearch: parseDavisVideoSearch,
  loader: async ({ params, location, search }) => {
    const resolvedSearch =
      search ??
      parseDavisVideoSearch(
        Object.fromEntries(new URLSearchParams(location?.search ?? '')),
      )

    const payload = await getDavisVideoDetails({
      data: {
        videoId: params.id,
        commentsPage: resolvedSearch.commentsPage,
        commentsSort: resolvedSearch.commentsSort,
        commentsFilter: resolvedSearch.commentsFilter,
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
  component: DavisVideoRoute,
})

function DavisVideoRoute() {
  const payload = Route.useLoaderData()
  const params = Route.useParams()
  const search = Route.useSearch()

  return (
    <DavisVideoView
      payload={payload}
      videoId={params.id}
      commentsPage={search.commentsPage}
      commentsSort={search.commentsSort}
      commentsFilter={search.commentsFilter}
    />
  )
}

const URL_REGEX = /https?:\/\/[^\s)>]+/g

function Linkified({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  URL_REGEX.lastIndex = 0
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const url = match[0]
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-blue-600 hover:underline"
      >
        {url}
      </a>,
    )
    lastIndex = match.index + url.length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
      {parts}
    </p>
  )
}

const FILTER_OPTIONS: { value: CommentsFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'isQuestion', label: 'Questions' },
  { value: 'isPositiveComment', label: 'Positive' },
  { value: 'isSponsorMention', label: 'Sponsor mentions' },
  { value: 'isEditingMistake', label: 'Editing mistakes' },
]

const SORT_OPTIONS: { value: CommentsSort; label: string }[] = [
  { value: 'likeCount', label: 'Most liked' },
  { value: 'publishedAt', label: 'Newest' },
]

const formatMetric = (value: number | null) =>
  typeof value === 'number' ? value.toLocaleString() : 'N/A'

class XPostLinkForm extends React.Component<
  {
    videoId: string
    currentUrl: string | null
    commentsPage: number
    commentsSort: CommentsSort
    commentsFilter: CommentsFilter
  },
  {
    xPostUrlInput: string
    isSavingXPost: boolean
    xPostSaveError: string | null
  }
> {
  state = {
    xPostUrlInput: this.props.currentUrl ?? '',
    isSavingXPost: false,
    xPostSaveError: null as string | null,
  }

  componentDidUpdate(prevProps: Readonly<{ currentUrl: string | null }>) {
    if (prevProps.currentUrl !== this.props.currentUrl) {
      this.setState({
        xPostUrlInput: this.props.currentUrl ?? '',
        xPostSaveError: null,
      })
    }
  }

  render() {
    const { videoId, commentsPage, commentsSort, commentsFilter } = this.props
    const { xPostUrlInput, isSavingXPost, xPostSaveError } = this.state

    const refreshPage = () => {
      const params = new URLSearchParams({
        commentsPage: String(commentsPage),
        commentsSort,
        commentsFilter,
      })
      window.location.assign(
        `/davis/video/${encodeURIComponent(videoId)}?${params.toString()}`,
      )
    }

    const syncXPost = (xPostUrl: string) => {
      this.setState({ isSavingXPost: true, xPostSaveError: null })

      linkDavisVideoToXPost({
        data: { videoId, xPostUrl },
      })
        .then((result) => {
          if (result.status === 'error') {
            this.setState({
              xPostSaveError: result.error.message,
              isSavingXPost: false,
            })
            return
          }

          refreshPage()
        })
        .catch(() => {
          this.setState({
            xPostSaveError: 'Unable to save X post right now',
            isSavingXPost: false,
          })
        })
    }

    return (
      <form
        className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
        onSubmit={(event) => {
          event.preventDefault()
          syncXPost(xPostUrlInput)
        }}
      >
        <label
          htmlFor="x-post-url"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Link X Post
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="x-post-url"
            type="url"
            value={xPostUrlInput}
            onChange={(event) =>
              this.setState({
                xPostUrlInput: event.target.value,
              })
            }
            placeholder="https://x.com/.../status/123"
            className="min-w-[220px] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
          />
          <button
            type="submit"
            disabled={isSavingXPost}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingXPost ? 'Saving...' : 'Save'}
          </button>
          {this.props.currentUrl ? (
            <button
              type="button"
              disabled={isSavingXPost}
              onClick={() => syncXPost(this.props.currentUrl ?? '')}
              className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-medium text-sky-900 transition-colors hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-900/60"
            >
              {isSavingXPost ? 'Refreshing...' : 'Refresh data'}
            </button>
          ) : null}
        </div>
        {xPostSaveError ? (
          <p className="text-xs text-red-600">{xPostSaveError}</p>
        ) : null}
      </form>
    )
  }
}

export const DavisVideoView = ({
  payload,
  videoId,
  commentsPage,
  commentsSort,
  commentsFilter,
}: {
  payload: DavisVideoPayload
  videoId: string
  commentsPage: number
  commentsSort: CommentsSort
  commentsFilter: CommentsFilter
}) => {
  if (payload.status === 'error') {
    return (
      <ErrorState
        title="Unable to load video details"
        message={payload.error.message}
      />
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
      <article className="grid gap-6 rounded-xl border border-neutral-200 bg-white p-5 lg:grid-cols-[320px_1fr] dark:border-neutral-700 dark:bg-neutral-900">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="aspect-video w-full rounded-lg object-cover"
        />

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-100">
              <a
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-red-600 hover:underline"
              >
                {video.title}
              </a>
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Published {new Date(video.publishedAt).toLocaleString()}
            </p>
          </div>

          <VideoMetrics
            viewCount={video.viewCount}
            likeCount={video.likeCount}
            commentCount={video.commentCount}
            xViews={video.xPost?.views}
          />

          <XPostLinkForm
            videoId={videoId}
            currentUrl={video.xPost?.url ?? null}
            commentsPage={commentsPage}
            commentsSort={commentsSort}
            commentsFilter={commentsFilter}
          />

          {video.xPost ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                Linked X Post
              </p>
              <a
                href={video.xPost.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all text-sm text-sky-700 hover:underline dark:text-sky-400"
              >
                {video.xPost.url}
              </a>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-sky-900 dark:text-sky-200">
                <span>Views: {formatMetric(video.xPost.views)}</span>
                <span>Likes: {formatMetric(video.xPost.likes)}</span>
                <span>Reposts: {formatMetric(video.xPost.reposts)}</span>
                <span>Comments: {formatMetric(video.xPost.comments)}</span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {video.sponsors.length > 0 ? (
              video.sponsors.map((sponsor) => (
                <Link
                  key={sponsor.sponsorId}
                  to="/davis/sponsor/$id"
                  params={{ id: sponsor.slug }}
                  search={{ page: 1 }}
                  className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/60"
                >
                  {sponsor.name}
                </Link>
              ))
            ) : (
              <span className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs text-neutral-400 dark:border-neutral-700">
                No sponsor
              </span>
            )}
          </div>

          <Linkified text={video.description} />
        </div>
      </article>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Comments
            </h3>

            {/* Sort */}
            <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
              {SORT_OPTIONS.map((opt) => (
                <Link
                  key={opt.value}
                  to="/davis/video/$id"
                  params={{ id: videoId }}
                  search={{
                    commentsPage: 1,
                    commentsSort: opt.value,
                    commentsFilter,
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    commentsSort === opt.value
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                to="/davis/video/$id"
                params={{ id: videoId }}
                search={{
                  commentsPage: 1,
                  commentsSort,
                  commentsFilter: opt.value,
                }}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  commentsFilter === opt.value
                    ? 'border-neutral-800 bg-neutral-800 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:text-neutral-300'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <PaginationControls
          page={page}
          totalPages={totalPages}
          className="mb-4 flex items-center justify-end gap-2 text-sm"
          getLink={(nextPage) => ({
            to: '/davis/video/$id' as const,
            params: { id: videoId },
            search: {
              commentsPage: nextPage,
              commentsSort,
              commentsFilter,
            },
          })}
        />

        <div className="space-y-2">
          {items.map((comment) => (
            <article
              key={comment.commentId}
              className="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {comment.author}
                </span>
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
      </section>
    </section>
  )
}
