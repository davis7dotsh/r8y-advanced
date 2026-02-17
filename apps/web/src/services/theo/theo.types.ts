export const VIDEO_PAGE_SIZE = 50
export const COMMENT_PAGE_SIZE = 50
export const SEARCH_SUGGESTION_LIMIT = 8

export type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type SponsorSummary = {
  sponsorId: string
  name: string
  slug: string
}

export type VideoSummary = {
  videoId: string
  title: string
  thumbnailUrl: string
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  sponsors: SponsorSummary[]
}

export type TheoVideoComment = {
  commentId: string
  author: string
  text: string
  publishedAt: string
  likeCount: number
  replyCount: number
  isProcessed: boolean
  isEditingMistake: boolean | null
  isSponsorMention: boolean | null
  isQuestion: boolean | null
  isPositiveComment: boolean | null
}

export type TheoVideoDetails = {
  video: {
    videoId: string
    title: string
    description: string
    thumbnailUrl: string
    publishedAt: string
    viewCount: number
    likeCount: number
    commentCount: number
    sponsors: SponsorSummary[]
  }
  comments: {
    items: TheoVideoComment[]
    pagination: Pagination
  }
}

export type TheoSponsorDetails = {
  sponsor: {
    sponsorId: string
    name: string
    slug: string
    createdAt: string
  }
  stats: {
    totalViews: number
    averageViews: number
    lastPublishedAt: string | null
    bestPerformingVideo: {
      videoId: string
      title: string
      viewCount: number
    } | null
  }
  videos: {
    items: VideoSummary[]
    pagination: Pagination
  }
}

export type TheoSearchSuggestions = {
  videos: {
    videoId: string
    title: string
  }[]
  sponsors: SponsorSummary[]
}
