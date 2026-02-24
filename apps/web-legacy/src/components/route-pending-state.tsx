export const RoutePendingState = () => (
  <section
    className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"
    aria-live="polite"
    aria-busy="true"
  >
    <p className="text-sm text-neutral-500">Loading...</p>
    <div className="space-y-2.5">
      <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      <div className="h-4 w-full animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
    </div>
  </section>
)
