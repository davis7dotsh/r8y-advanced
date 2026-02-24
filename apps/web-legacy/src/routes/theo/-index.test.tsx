/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { vi, test, expect } from 'vitest'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  )

  return {
    ...actual,
    Link: ({ children }: { children: any }) => <a>{children}</a>,
  }
})

import { TheoVideosView } from './index'

test('renders theo list view', () => {
  render(
    <TheoVideosView
      payload={{
        status: 'ok',
        data: {
          q: 'theo',
          pagination: {
            page: 1,
            pageSize: 50,
            total: 1,
            totalPages: 1,
          },
          items: [
            {
              videoId: 'video-1',
              title: 'Theo updates',
              thumbnailUrl: 'https://example.com/thumb.jpg',
              publishedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
              viewCount: 10,
              likeCount: 5,
              commentCount: 2,
              sponsors: [],
            },
          ],
        },
      }}
      search={{
        page: 1,
        q: 'theo',
      }}
    />,
  )

  expect(screen.getByText('Theo updates')).toBeTruthy()
  expect(screen.getByText(/Showing/)).toBeTruthy()
})
