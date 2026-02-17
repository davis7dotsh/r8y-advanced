import { expect, test, vi } from 'vitest'

vi.mock('@/db/client.server', () => ({
  db: {},
}))

import { TheoSearchService } from './theo-search.server'

test('returns empty suggestions for short query', async () => {
  const result = await TheoSearchService.suggest({}, { q: 'a' })

  expect(result.status).not.toBe('error')

  if (result.status === 'error') {
    throw result.error
  }

  expect(result.value.videos).toEqual([])
  expect(result.value.sponsors).toEqual([])
})

test('returns suggestions from injected query loader', async () => {
  const result = await TheoSearchService.suggest(
    {
      queries: {
        loadSuggestions: async () => ({
          videos: [
            {
              videoId: 'video-1',
              title: 'Theo Build Log',
            },
          ],
          sponsors: [
            {
              sponsorId: 'sponsor-1',
              name: 'Acme',
              slug: 'acme--0001',
            },
          ],
        }),
      },
    },
    {
      q: 'theo',
    },
  )

  expect(result.status).not.toBe('error')

  if (result.status === 'error') {
    throw result.error
  }

  expect(result.value.videos[0]?.videoId).toBe('video-1')
  expect(result.value.sponsors[0]?.slug).toBe('acme--0001')
})
