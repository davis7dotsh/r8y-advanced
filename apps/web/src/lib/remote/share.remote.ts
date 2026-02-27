import { query } from '$app/server'
import type { ShareVideoData } from '@/services/share/share-video.server'

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

export type ShareVideoPayload = Awaited<ReturnType<typeof getShareVideo>>
