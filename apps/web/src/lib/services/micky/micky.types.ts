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
  xPost: {
    url: string
    views: number | null
    likes: number | null
    reposts: number | null
    comments: number | null
    quotes: number | null
  } | null
}

export type MickyVideoComment = {
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

export type MickyVideoDetails = {
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
    xPost: {
      url: string
      views: number | null
      likes: number | null
      reposts: number | null
      comments: number | null
      quotes: number | null
    } | null
  }
  comments: {
    items: MickyVideoComment[]
    pagination: Pagination
  }
}

export type SponsorMentionComment = {
  commentId: string
  author: string
  text: string
  publishedAt: string
  likeCount: number
  replyCount: number
  videoId: string
  videoTitle: string
}

export type MickySponsorDetails = {
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
    totalXViews: number
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
  sponsorMentions: {
    items: SponsorMentionComment[]
    pagination: Pagination
  }
}

export type MickySearchSuggestions = {
  videos: {
    videoId: string
    title: string
  }[]
  sponsors: SponsorSummary[]
}
