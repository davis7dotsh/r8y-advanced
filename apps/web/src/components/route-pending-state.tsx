export const RoutePendingState = () => (
  <section
    className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5"
    aria-live="polite"
    aria-busy="true"
  >
    <p className="text-sm text-neutral-500">Loading...</p>
    <div className="space-y-2.5">
      <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200" />
      <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-100" />
    </div>
  </section>
)
