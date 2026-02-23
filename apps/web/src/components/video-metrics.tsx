export const VideoMetrics = ({
  viewCount,
  likeCount,
  commentCount,
  xViews = null,
  variant = 'summary',
}: {
  viewCount: number
  likeCount: number
  commentCount: number
  xViews?: number | null
  variant?: 'summary' | 'detail'
}) =>
  variant === 'summary' ? (
    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
      <span>
        <span className="font-medium text-neutral-700 dark:text-neutral-300">
          {(viewCount + (xViews ?? 0)).toLocaleString()}
        </span>{' '}
        total
      </span>
      <span className="text-red-600">
        <span className="font-medium">{viewCount.toLocaleString()}</span> yt
      </span>
      {xViews != null ? (
        <span className="text-sky-600">
          <span className="font-medium">{xViews.toLocaleString()}</span> X
        </span>
      ) : null}
      <span>
        <span className="font-medium text-neutral-700 dark:text-neutral-300">
          {likeCount.toLocaleString()}
        </span>{' '}
        likes
      </span>
      <span>
        <span className="font-medium text-neutral-700 dark:text-neutral-300">
          {commentCount.toLocaleString()}
        </span>{' '}
        comments
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-5 text-sm text-neutral-500">
      <span>
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
          {viewCount.toLocaleString()}
        </span>{' '}
        views
      </span>
      <span>
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
          {likeCount.toLocaleString()}
        </span>{' '}
        likes
      </span>
      <span>
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
          {commentCount.toLocaleString()}
        </span>{' '}
        comments
      </span>
    </div>
  )
