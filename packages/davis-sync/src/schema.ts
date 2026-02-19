import {
  comments,
  crawlerState,
  notificationTypeEnum,
  notifications,
  sponsorToVideos,
  sponsors,
  davis,
  videos,
} from "./db/schema";

export {
  comments,
  crawlerState,
  notificationTypeEnum,
  notifications,
  sponsorToVideos,
  sponsors,
  davis,
  videos,
};

export const davisSchema = {
  comments,
  crawlerState,
  notifications,
  sponsorToVideos,
  sponsors,
  videos,
} as const;

export type VideoRow = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

export type CommentRow = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type SponsorRow = typeof sponsors.$inferSelect;
export type NewSponsor = typeof sponsors.$inferInsert;

export type SponsorToVideoRow = typeof sponsorToVideos.$inferSelect;
export type NewSponsorToVideo = typeof sponsorToVideos.$inferInsert;

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type CrawlerStateRow = typeof crawlerState.$inferSelect;
export type NewCrawlerState = typeof crawlerState.$inferInsert;
