import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/davis')({
  component: DavisLayout,
  notFoundComponent: DavisNotFound,
})

function DavisLayout() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <header className="mb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-600">
              Davis Data
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Davis Explorer
            </h1>
          </div>
          <Link
            to="/davis"
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

function DavisNotFound() {
  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
      <h2 className="text-lg font-semibold text-destructive">Not found</h2>
      <p className="mt-2 text-sm text-destructive/80">
        The Davis resource you requested does not exist.
      </p>
    </section>
  )
}
