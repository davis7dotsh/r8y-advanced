import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/theo')({
  component: TheoLayout,
  notFoundComponent: TheoNotFound,
})

function TheoLayout() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <header className="mb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-600">
              Theo Data
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Theo Explorer
            </h1>
          </div>
          <Link
            to="/theo"
            search={{
              page: 1,
              q: undefined,
            }}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Browse all videos
          </Link>
        </div>
      </header>

      <Outlet />
    </main>
  )
}

function TheoNotFound() {
  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
      <h2 className="text-lg font-semibold text-destructive">Not found</h2>
      <p className="mt-2 text-sm text-destructive/80">
        The Theo resource you requested does not exist.
      </p>
    </section>
  )
}
