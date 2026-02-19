import { expect, test, vi } from 'vitest'

vi.mock('@/db/davis.client.server', () => ({
  davisDb: {},
}))

import { DavisSearchService } from './davis-search.server'

test('returns empty suggestions for short query', async () => {
  const result = await DavisSearchService.suggest({}, { q: 'a' })

  expect(result.status).not.toBe('error')

  if (result.status === 'error') {
    throw result.error
  }

  expect(result.value.videos).toEqual([])
  expect(result.value.sponsors).toEqual([])
})

test('returns suggestions from injected query loader', async () => {
  const result = await DavisSearchService.suggest(
    {
      queries: {
        loadSuggestions: async () => ({
          videos: [
            {
              videoId: 'video-1',
              title: 'Davis Build Log',
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
      q: 'davis',
    },
  )

  expect(result.status).not.toBe('error')

  if (result.status === 'error') {
    throw result.error
  }

  expect(result.value.videos[0]?.videoId).toBe('video-1')
  expect(result.value.sponsors[0]?.slug).toBe('acme--0001')
})
