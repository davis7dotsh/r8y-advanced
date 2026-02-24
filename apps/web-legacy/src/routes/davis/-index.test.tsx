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

import { DavisVideosView } from './index'

test('renders davis list view', () => {
  render(
    <DavisVideosView
      payload={{
        status: 'ok',
        data: {
          q: 'davis',
          pagination: {
            page: 1,
            pageSize: 50,
            total: 1,
            totalPages: 1,
          },
          items: [
            {
              videoId: 'video-1',
              title: 'Davis updates',
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
        q: 'davis',
      }}
    />,
  )

  expect(screen.getByText('Davis updates')).toBeTruthy()
  expect(screen.getByText(/Showing/)).toBeTruthy()
})
