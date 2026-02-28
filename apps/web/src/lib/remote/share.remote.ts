import { query } from '$app/server'
import type { ShareVideoData } from '@/services/share/share-video.server'
import type { ShareSponsorData } from '@/services/share/share-sponsor.server'

type ServerError = {
  tag: string
  message: string
}

type ServerPayload<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; error: ServerError }

const toError = (error: { _tag: string; message: string }) => ({
  tag: error._tag,
  message: error.message,
})

const toObject = (input: unknown) =>
  input && typeof input === 'object' ? (input as Record<string, unknown>) : {}

export const getShareVideo = query('unchecked', async (input: unknown) => {
  const value = toObject(input)
  const { ShareVideoService } =
    await import('@/services/share/share-video.server')

  const channel = typeof value.channel === 'string' ? value.channel : ''
  const videoId = typeof value.videoId === 'string' ? value.videoId : ''

  const result = await ShareVideoService.getVideo(channel, videoId)

  if (result.status === 'error') {
    return {
      status: 'error',
      error: toError(result.error),
    } satisfies ServerPayload<ShareVideoData>
  }

  return {
    status: 'ok',
    data: result.value,
  } satisfies ServerPayload<ShareVideoData>
})

export const getShareSponsor = query('unchecked', async (input: unknown) => {
  const value = toObject(input)
  const { ShareSponsorService } =
    await import('@/services/share/share-sponsor.server')

  const channel = typeof value.channel === 'string' ? value.channel : ''
  const slug = typeof value.slug === 'string' ? value.slug : ''
  const page = typeof value.page === 'number' ? value.page : undefined

  const result = await ShareSponsorService.getSponsor(channel, slug, page)

  if (result.status === 'error') {
    return {
      status: 'error',
      error: toError(result.error),
    } satisfies ServerPayload<ShareSponsorData>
  }

  return {
    status: 'ok',
    data: result.value,
  } satisfies ServerPayload<ShareSponsorData>
})

export type ShareVideoPayload = Awaited<ReturnType<typeof getShareVideo>>
export type ShareSponsorPayload = Awaited<ReturnType<typeof getShareSponsor>>
