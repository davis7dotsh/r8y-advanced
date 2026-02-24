import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { RoutePendingState } from '@/components/route-pending-state'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultSsr: false,
    defaultPendingComponent: RoutePendingState,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
