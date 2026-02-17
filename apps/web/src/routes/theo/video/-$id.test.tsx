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

import { TheoVideoView } from './$id'

test('renders video detail view', () => {
  render(
    <TheoVideoView
      videoId="video-1"
      payload={{
        status: 'ok',
        data: {
          video: {
            videoId: 'video-1',
            title: 'Theo deep dive',
            description: 'desc',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            publishedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
            viewCount: 10,
            likeCount: 5,
            commentCount: 2,
            sponsors: [],
          },
          comments: {
            pagination: {
              page: 1,
              pageSize: 50,
              total: 1,
              totalPages: 1,
            },
            items: [
              {
                commentId: 'c-1',
                author: 'davis',
                text: 'great!',
                publishedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
                likeCount: 1,
                replyCount: 0,
                isProcessed: true,
                isEditingMistake: false,
                isSponsorMention: false,
                isQuestion: false,
                isPositiveComment: true,
              },
            ],
          },
        },
      }}
    />,
  )

  expect(screen.getByText('Theo deep dive')).toBeTruthy()
  expect(screen.getByText('great!')).toBeTruthy()
})
