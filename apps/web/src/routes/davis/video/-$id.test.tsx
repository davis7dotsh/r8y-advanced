/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, vi, test, expect } from 'vitest'

afterEach(() => {
  cleanup()
})

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useState: <T,>(initial: T) => [initial, vi.fn()] as const,
    useEffect: vi.fn(),
  }
})

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  )

  const createFileRoute = () => () => ({
    useLoaderData: () => ({}),
    useParams: () => ({ id: 'video-1' }),
    useSearch: () => ({
      commentsPage: 1,
      commentsSort: 'likeCount',
      commentsFilter: 'all',
    }),
  })

  return {
    ...actual,
    Link: ({ children }: { children: any }) => <a>{children}</a>,
    createFileRoute,
    notFound: () => {
      throw new Error('notFound')
    },
    useNavigate: () => vi.fn(),
  }
})

import { DavisVideoView } from './$id'

test('renders video detail view', () => {
  render(
    <DavisVideoView
      videoId="video-1"
      commentsPage={1}
      commentsSort="likeCount"
      commentsFilter="all"
      payload={{
        status: 'ok',
        data: {
          video: {
            videoId: 'video-1',
            title: 'Davis deep dive',
            description: 'desc',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            publishedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
            viewCount: 10,
            likeCount: 5,
            commentCount: 2,
            sponsors: [],
            xPost: {
              url: 'https://x.com/i/web/status/12345',
              views: 1000,
              likes: 120,
              reposts: 33,
              comments: 9,
            },
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

  expect(screen.getByText('Davis deep dive')).toBeTruthy()
  expect(screen.getByText('great!')).toBeTruthy()
  expect(screen.getByText('Linked X Post')).toBeTruthy()
  expect(screen.getByText('Views: 1,000')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Refresh data' })).toBeTruthy()
})

test('renders without linked x post', () => {
  render(
    <DavisVideoView
      videoId="video-1"
      commentsPage={1}
      payload={{
        status: 'ok',
        data: {
          video: {
            videoId: 'video-1',
            title: 'Davis deep dive',
            description: 'desc',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            publishedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
            viewCount: 10,
            likeCount: 5,
            commentCount: 2,
            sponsors: [],
            xPost: null,
          },
          comments: {
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
      commentsSort="likeCount"
      commentsFilter="all"
    />,
  )

  expect(screen.queryByText('Linked X Post')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Refresh data' })).toBeNull()
})
