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
            xUrl: 'https://x.com/i/web/status/999',
            xViews: 5000,
            xLikes: 250,
            xReposts: 40,
            xComments: 15,
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
            xUrl: 'https://x.com/i/web/status/999',
            xViews: 5000,
            xLikes: 250,
            xReposts: 40,
            xComments: 15,
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
  expect(result.value.video.xPost?.url).toBe('https://x.com/i/web/status/999')
  expect(result.value.video.xPost?.views).toBe(5000)
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

test('links x post and persists metrics', async () => {
  const getById = vi.fn(async () => ({
    data: {
      publicMetrics: {
        impression_count: 1200,
        like_count: 73,
        retweet_count: 11,
        reply_count: 5,
      },
    },
  }))
  const updateVideoXPost = vi.fn(async () => [{ videoId: 'video-1' }])

  const result = await TheoVideoService.linkXPost(
    {
      xClient: {
        posts: {
          getById,
        },
      },
      queries: {
        updateVideoXPost,
      },
    },
    {
      videoId: 'video-1',
      xPostUrl: 'https://twitter.com/theo/status/1234567890',
    },
  )

  expect(result.status).toBe('ok')
  expect(getById).toHaveBeenCalledWith('1234567890', {
    tweetFields: ['public_metrics'],
  })
  expect(updateVideoXPost).toHaveBeenCalledWith({
    videoId: 'video-1',
    xUrl: 'https://x.com/i/web/status/1234567890',
    xViews: 1200,
    xLikes: 73,
    xReposts: 11,
    xComments: 5,
  })
})

test('rejects invalid x post url', async () => {
  const result = await TheoVideoService.linkXPost(
    {
      xClient: {
        posts: {
          getById: vi.fn(),
        },
      },
    },
    {
      videoId: 'video-1',
      xPostUrl: 'https://example.com/some/path',
    },
  )

  expect(result.status).toBe('error')

  if (result.status !== 'error') {
    throw new Error('expected an error result')
  }

  expect(result.error._tag).toBe('InvalidXPostUrlError')
})

test('returns config error when x api key missing', async () => {
  const previous = process.env.X_API_KEY
  delete process.env.X_API_KEY

  const result = await TheoVideoService.linkXPost(
    {},
    {
      videoId: 'video-1',
      xPostUrl: 'https://x.com/i/web/status/123456',
    },
  )

  if (typeof previous === 'string') {
    process.env.X_API_KEY = previous
  } else {
    delete process.env.X_API_KEY
  }

  expect(result.status).toBe('error')

  if (result.status !== 'error') {
    throw new Error('expected an error result')
  }

  expect(result.error._tag).toBe('XApiConfigError')
})

test('returns x post fetch error when x api fails', async () => {
  const result = await TheoVideoService.linkXPost(
    {
      xClient: {
        posts: {
          getById: async () => {
            throw new Error('boom')
          },
        },
      },
    },
    {
      videoId: 'video-1',
      xPostUrl: 'https://x.com/someone/status/123456',
    },
  )

  expect(result.status).toBe('error')

  if (result.status !== 'error') {
    throw new Error('expected an error result')
  }

  expect(result.error._tag).toBe('XPostFetchError')
})
