import { expect, test, vi } from 'vitest'

vi.mock('@/db/client.server', () => ({
  db: {},
}))

import { TheoVideoService } from './theo-video.server'

test('returns video details and paginated comments', async () => {
  const result = await TheoVideoService.getById(
    {
      queries: {
        loadVideoRows: async () => [
          {
            videoId: 'video-1',
            title: 'Intro to Testing',
            description: 'A video description',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            publishedAt: new Date('2026-01-03T00:00:00.000Z'),
            viewCount: 123,
            likeCount: 45,
            commentCount: 2,
            sponsorId: 'sponsor-1',
            sponsorName: 'Acme',
          },
          {
            videoId: 'video-1',
            title: 'Intro to Testing',
            description: 'A video description',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            publishedAt: new Date('2026-01-03T00:00:00.000Z'),
            viewCount: 123,
            likeCount: 45,
            commentCount: 2,
            sponsorId: 'sponsor-2',
            sponsorName: 'Linear',
          },
        ],
        countComments: async () => [{ total: 2 }],
        loadComments: async () => [
          {
            commentId: 'c-1',
            author: 'davis',
            text: 'nice one',
            publishedAt: new Date('2026-01-04T00:00:00.000Z'),
            likeCount: 2,
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
    {
      videoId: 'video-1',
      commentsPage: 1,
    },
  )

  expect(result.status).not.toBe('error')

  if (result.status === 'error') {
    throw result.error
  }

  expect(result.value.video.videoId).toBe('video-1')
  expect(result.value.video.sponsors).toHaveLength(2)
  expect(result.value.comments.pagination.total).toBe(2)
  expect(result.value.comments.items[0]?.commentId).toBe('c-1')
})

test('returns not found for unknown video', async () => {
  const result = await TheoVideoService.getById(
    {
      queries: {
        loadVideoRows: async () => [],
      },
    },
    {
      videoId: 'missing-video',
    },
  )

  expect(result.status).toBe('error')

  if (result.status !== 'error') {
    throw new Error('expected an error result')
  }

  expect(result.error._tag).toBe('VideoNotFoundError')
})
