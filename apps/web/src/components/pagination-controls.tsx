import { Link } from '@tanstack/react-router'

export const PaginationControls = ({
  page,
  totalPages,
  getLink,
  className = 'flex items-center gap-2 text-sm',
}: {
  page: number
  totalPages: number
  getLink: (page: number) => {
    to: string
    search?: Record<string, unknown>
    params?: Record<string, string>
  }
  className?: string
}) => (
  <div className={className}>
    {page > 1 ? (
      <Link
        {...(getLink(page - 1) as any)}
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
        {...(getLink(page + 1) as any)}
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
