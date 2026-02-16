import {
  boolean,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";

const theo = pgSchema("theo");

export const notificationTypeEnum = theo.enum("notification_type", [
  "todoist_video_live",
  "discord_video_live",
  "discord_flagged_comment",
]);

export const videos = theo.table(
  "videos",
  {
    videoId: varchar("video_id", { length: 55 }).primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    thumbnailUrl: text("thumbnail_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    viewCount: integer("view_count").notNull(),
    likeCount: integer("like_count").notNull(),
    commentCount: integer("comment_count").notNull(),
    xUrl: text("x_url"),
    xViews: integer("x_views"),
    xLikes: integer("x_likes"),
    xReposts: integer("x_reposts"),
    xComments: integer("x_comments"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("videos_published_at").on(table.publishedAt),
    index("videos_title_search").on(table.title),
  ],
);

export const comments = theo.table(
  "comments",
  {
    commentId: varchar("comment_id", { length: 55 }).primaryKey(),
    videoId: varchar("video_id", { length: 55 })
      .notNull()
      .references(() => videos.videoId, { onDelete: "cascade" }),
    text: text("text").notNull(),
    author: text("author").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    likeCount: integer("like_count").notNull(),
    replyCount: integer("reply_count").notNull(),
    isEditingMistake: boolean("is_editing_mistake").notNull(),
    isSponsorMention: boolean("is_sponsor_mention").notNull(),
    isQuestion: boolean("is_question").notNull(),
    isPositiveComment: boolean("is_positive_comment").notNull(),
    isProcessed: boolean("is_processed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("comments_video_id").on(table.videoId),
    index("comments_comment_id").on(table.commentId),
  ],
);

export const sponsors = theo.table(
  "sponsors",
  {
    sponsorId: varchar("sponsor_id", { length: 55 }).primaryKey(),
    sponsorKey: varchar("sponsor_key", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sponsors_key").on(table.sponsorKey),
    index("sponsors_name_search").on(table.name),
  ],
);

export const sponsorToVideos = theo.table(
  "sponsor_to_videos",
  {
    sponsorId: varchar("sponsor_id", { length: 55 })
      .notNull()
      .references(() => sponsors.sponsorId, { onDelete: "cascade" }),
    videoId: varchar("video_id", { length: 55 })
      .notNull()
      .references(() => videos.videoId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sponsorId, table.videoId] }),
    index("sponsor_to_videos_sponsor_id").on(table.sponsorId),
    index("sponsor_to_videos_video_id").on(table.videoId),
  ],
);

export const notifications = theo.table(
  "notifications",
  {
    notificationId: varchar("notification_id", { length: 55 }).primaryKey(),
    videoId: varchar("video_id", { length: 55 })
      .notNull()
      .references(() => videos.videoId, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    message: text("message").notNull(),
    commentId: varchar("comment_id", { length: 55 }).references(
      () => comments.commentId,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("notifications_video_id").on(table.videoId)],
);
