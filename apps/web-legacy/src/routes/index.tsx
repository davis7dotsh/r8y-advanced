import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({
      to: '/theo',
      search: {
        page: 1,
        q: undefined,
      },
    })
  },
})
