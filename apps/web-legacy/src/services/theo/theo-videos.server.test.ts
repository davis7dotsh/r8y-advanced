import { expect, test, vi } from 'vitest'

vi.mock('@/db/client.server', () => ({
  db: {},
}))

import { TheoVideosService } from './theo-videos.server'

test('lists videos in requested order with all sponsors', async () => {
  const result = await TheoVideosService.list(
    {
      queries: {
        loadIdsAndTotal: async () => ({
          total: 2,
          videoIds: ['video-b', 'video-a'],
        }),
        loadVideos: async () => [
          {
            videoId: 'video-a',
            title: 'Video A',
            thumbnailUrl: 'https://example.com/a.jpg',
            publishedAt: new Date('2026-01-01T00:00:00.000Z'),
            viewCount: 100,
            likeCount: 10,
            commentCount: 3,
            sponsorId: 'sponsor-1',
            sponsorName: 'Acme',
          },
          {
            videoId: 'video-b',
            title: 'Video B',
            thumbnailUrl: 'https://example.com/b.jpg',
            publishedAt: new Date('2026-01-02T00:00:00.000Z'),
            viewCount: 200,
            likeCount: 20,
            commentCount: 5,
            sponsorId: 'sponsor-2',
            sponsorName: 'Linear',
          },
          {
            videoId: 'video-b',
            title: 'Video B',
            thumbnailUrl: 'https://example.com/b.jpg',
            publishedAt: new Date('2026-01-02T00:00:00.000Z'),
            viewCount: 200,
            likeCount: 20,
            commentCount: 5,
            sponsorId: 'sponsor-3',
            sponsorName: 'Vercel',
          },
        ],
      },
    },
    {
      page: 1,
      q: 'video',
    },
  )

  expect(result.status).not.toBe('error')

  if (result.status === 'error') {
    throw result.error
  }

  expect(result.value.items.map((item) => item.videoId)).toEqual([
    'video-b',
    'video-a',
  ])
  expect(
    result.value.items[0]?.sponsors.map((sponsor) => sponsor.name),
  ).toEqual(['Linear', 'Vercel'])
  expect(result.value.pagination.total).toBe(2)
})

test('returns validation error for invalid page size', async () => {
  const result = await TheoVideosService.list({}, { pageSize: 0 })

  expect(result.status).toBe('error')

  if (result.status !== 'error') {
    throw new Error('expected an error result')
  }

  expect(result.error._tag).toBe('InvalidVideosInputError')
})
