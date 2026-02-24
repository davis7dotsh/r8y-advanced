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

import { DavisSponsorView } from './$id'

test('renders sponsor detail view', () => {
  render(
    <DavisSponsorView
      sponsorSlug="acme--0001"
      page={1}
      mentionsPage={1}
      payload={{
        status: 'ok',
        data: {
          sponsor: {
            sponsorId: 'sponsor-1',
            name: 'Acme',
            slug: 'acme--0001',
            createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
          },
          stats: {
            totalViews: 10,
            averageViews: 10,
            lastPublishedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
            totalXViews: 0,
            bestPerformingVideo: {
              videoId: 'video-1',
              title: 'Sponsored episode',
              viewCount: 10,
            },
          },
          videos: {
            pagination: {
              page: 1,
              pageSize: 50,
              total: 1,
              totalPages: 1,
            },
            items: [
              {
                videoId: 'video-1',
                title: 'Sponsored episode',
                thumbnailUrl: 'https://example.com/thumb.jpg',
                publishedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
                viewCount: 10,
                likeCount: 5,
                commentCount: 2,
                sponsors: [],
              },
            ],
          },
          sponsorMentions: {
            pagination: {
              page: 1,
              pageSize: 50,
              total: 0,
              totalPages: 1,
            },
            items: [],
          },
        },
      }}
    />,
  )

  expect(screen.getByText('Acme')).toBeTruthy()
  expect(screen.getByText('Sponsored episode')).toBeTruthy()
  expect(screen.getByText('Total YT views')).toBeTruthy()
})
