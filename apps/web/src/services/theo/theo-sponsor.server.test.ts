import { expect, test, vi } from 'vitest'

vi.mock('@/db/client.server', () => ({
  db: {},
}))

import { TheoSponsorService } from './theo-sponsor.server'
import { toSponsorSlug } from './theo-utils'

test('returns sponsor details and paginated videos', async () => {
  const sponsorId = 'sponsor-0001'
  const sponsorName = 'Acme Corp'
  const slug = toSponsorSlug(sponsorName, sponsorId)

  const result = await TheoSponsorService.getBySlug(
    {
      queries: {
        loadSponsors: async () => [
          {
            sponsorId,
            name: sponsorName,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        countSponsorVideos: async () => [{ total: 1 }],
        loadSponsorVideos: async () => [
          {
            videoId: 'video-1',
            title: 'Sponsored video',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            publishedAt: new Date('2026-01-02T00:00:00.000Z'),
            viewCount: 100,
            likeCount: 20,
            commentCount: 5,
            xUrl: null,
            xViews: null,
            xLikes: null,
            xReposts: null,
            xComments: null,
          },
        ],
        loadSponsorStats: async () => [
          {
            totalViews: 100,
            averageViews: 100,
            lastPublishedAt: new Date('2026-01-02T00:00:00.000Z'),
            totalXViews: 0,
          },
        ],
        loadSponsorTopVideo: async () => [
          {
            videoId: 'video-1',
            title: 'Sponsored video',
            viewCount: 100,
          },
        ],
        countSponsorMentions: async () => [{ total: 0 }],
        loadSponsorMentions: async () => [],
      },
    },
    {
      slug,
      page: 1,
    },
  )

  expect(result.status).not.toBe('error')

  if (result.status === 'error') {
    throw result.error
  }

  expect(result.value.sponsor.slug).toBe(slug)
  expect(result.value.stats.totalViews).toBe(100)
  expect(result.value.stats.averageViews).toBe(100)
  expect(result.value.stats.bestPerformingVideo?.title).toBe('Sponsored video')
  expect(result.value.videos.items).toHaveLength(1)
  expect(result.value.videos.pagination.total).toBe(1)
})

test('returns not found for unknown sponsor slug', async () => {
  const result = await TheoSponsorService.getBySlug(
    {
      queries: {
        loadSponsors: async () => [],
      },
    },
    {
      slug: 'missing--0000',
    },
  )

  expect(result.status).toBe('error')

  if (result.status !== 'error') {
    throw new Error('expected an error result')
  }

  expect(result.error._tag).toBe('SponsorNotFoundError')
})
