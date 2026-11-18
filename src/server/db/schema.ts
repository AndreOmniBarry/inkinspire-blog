/**
 * Inkinspire database schema (PostgreSQL, Drizzle ORM).
 *
 * Conventions
 * - Primary keys: UUID v7 (time-ordered, not guessable) generated in the app.
 * - Times: timestamptz, stored in UTC, displayed in Africa/Lagos.
 * - Money: bigint minor units (kobo, cents) + ISO 4217 currency. Never floats.
 * - IP addresses: never stored raw; salted SHA-256 (`ip_hash`).
 * - JS property names are camelCase; columns are snake_case (Drizzle `casing: "snake_case"`).
 * - Phase 4 (expansion) structure is reserved now: post_authors (multiple authors, guest writers),
 *   posts.audio_url, posts.download_media_id. See docs/ARCHITECTURE.md.
 */
import { sql, type SQL } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

const id = () =>
  uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7());
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ───────────────────────────── Enums ───────────────────────────── */

export const roleEnum = pgEnum("role", ["owner", "admin", "editor", "author", "moderator", "reader"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "pending_review",
  "scheduled",
  "published",
  "archived",
]);
export const visibilityEnum = pgEnum("visibility", ["free", "premium"]);
export const commentStatusEnum = pgEnum("comment_status", ["pending", "approved", "rejected", "spam"]);
export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "pending",
  "confirmed",
  "unsubscribed",
  "bounced",
  "complained",
]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "cancelled",
]);
export const outboxStatusEnum = pgEnum("outbox_status", ["queued", "sending", "sent", "failed", "suppressed"]);
export const planIntervalEnum = pgEnum("plan_interval", ["monthly", "yearly"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "incomplete",
  "active",
  "past_due",
  "cancelled", // cancelled at period end; still entitled until current_period_end
  "expired",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
  "abandoned",
]);
export const entitlementSourceEnum = pgEnum("entitlement_source", ["subscription", "complimentary"]);
export const mediaScanEnum = pgEnum("media_scan", ["clean", "quarantined", "pending"]);
export const homepageSectionEnum = pgEnum("homepage_section", [
  "hero",
  "editors_picks",
  "latest",
  "popular",
  "categories",
  "author",
  "newsletter",
  "membership",
  "collections",
]);

/* ─────────────────────── Identity (Better Auth) ─────────────────────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    role: roleEnum().notNull().default("reader"),
    status: userStatusEnum().notNull().default("active"),
    twoFactorEnabled: boolean().default(false),
    mustChangePassword: boolean().notNull().default(false),
    marketingConsentAt: timestamp({ withTimezone: true }),
    lastSeenAt: timestamp({ withTimezone: true }),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`), index().on(t.role)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(), // Better Auth writes this; we store a hash (see auth config)
    userAgent: text(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: id(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.identifier)],
);

export const twoFactors = pgTable(
  "two_factors",
  {
    id: id(),
    secret: text().notNull(),
    backupCodes: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    verified: boolean().default(true),
    failedVerificationCount: integer().default(0),
    lockedUntil: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.userId), index().on(t.secret)],
);

export const rateLimits = pgTable("rate_limits", {
  id: id(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});

export const loginEvents = pgTable(
  "login_events",
  {
    id: id(),
    userId: uuid().references(() => users.id, { onDelete: "cascade" }),
    event: text().notNull(), // sign_in, sign_in_failed, two_factor_failed, sign_out, password_changed
    ipHash: text(),
    userAgent: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.createdAt)],
);

/* ───────────────────────────── People ───────────────────────────── */

export const authors = pgTable("authors", {
  id: id(),
  userId: uuid().references(() => users.id, { onDelete: "set null" }),
  slug: text().notNull().unique(),
  name: text().notNull(),
  /** Short line under the byline, e.g. "Storyteller and essayist". */
  tagline: text(),
  bio: text(),
  photoMediaId: uuid(),
  socials: jsonb().$type<Partial<Record<SocialNetwork, string>>>().notNull().default({}),
  isGuest: boolean().notNull().default(false),
  isDemo: boolean().notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type SocialNetwork = "instagram" | "x" | "facebook" | "linkedin" | "tiktok" | "youtube" | "website" | "email";

/* ───────────────────────────── Media ───────────────────────────── */

export const media = pgTable(
  "media",
  {
    id: id(),
    key: text().notNull().unique(), // storage key (R2 or local)
    filename: text().notNull(),
    mime: text().notNull(),
    bytes: integer().notNull(),
    width: integer(),
    height: integer(),
    /** Tiny blurred preview (base64 WebP data URI, ~300 bytes) shown while the image loads. */
    placeholder: text(),
    focalX: smallint().notNull().default(50), // percent
    focalY: smallint().notNull().default(50),
    alt: text().notNull(),
    caption: text(),
    credit: text(),
    /** Responsive variants: { "avif": { "640": key, ... }, "webp": { ... } } */
    variants: jsonb().$type<Record<string, Record<string, string>>>().notNull().default({}),
    scan: mediaScanEnum().notNull().default("clean"),
    uploadedById: uuid().references(() => users.id, { onDelete: "set null" }),
    isDemo: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.createdAt)],
);

/* ───────────────────────────── Content ───────────────────────────── */

export const categories = pgTable("categories", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  colour: text().notNull().default("oxblood"), // CategoryColour token key
  position: integer().notNull().default(0),
  seoTitle: text(),
  seoDescription: text(),
  isDemo: boolean().notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const tags = pgTable("tags", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  createdAt: createdAt(),
});

export const collections = pgTable("collections", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  coverMediaId: uuid().references(() => media.id, { onDelete: "set null" }),
  visibility: visibilityEnum().notNull().default("free"),
  isDemo: boolean().notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const posts = pgTable(
  "posts",
  {
    id: id(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    subtitle: text(),
    excerpt: text(),
    status: postStatusEnum().notNull().default("draft"),
    visibility: visibilityEnum().notNull().default("free"),
    /** TipTap JSON: the source of truth, including the protected part. Never selected by public code. */
    contentJson: jsonb().notNull().default({ type: "doc", content: [] }),
    /** Sanitised HTML of everything before the paywall marker (or everything, for free stories). */
    previewHtml: text().notNull().default(""),
    /** Sanitised HTML of the full story. Only read via src/server/content/protected.ts. */
    bodyHtml: text().notNull().default(""),
    /** Plain text indexed for search: full text for free stories, preview only for premium. */
    searchText: text().notNull().default(""),
    wordCount: integer().notNull().default(0),
    readingMinutes: integer().notNull().default(1),
    hasPaywall: boolean().notNull().default(false),
    categoryId: uuid().references(() => categories.id, { onDelete: "set null" }),
    collectionId: uuid().references(() => collections.id, { onDelete: "set null" }),
    coverMediaId: uuid().references(() => media.id, { onDelete: "set null" }),
    featured: boolean().notNull().default(false),
    commentsEnabled: boolean().notNull().default(true),
    seoTitle: text(),
    seoDescription: text(),
    canonicalUrl: text(),
    scheduledAt: timestamp({ withTimezone: true }),
    publishedAt: timestamp({ withTimezone: true }),
    archivedAt: timestamp({ withTimezone: true }),
    reviewNote: text(),
    createdById: uuid().references(() => users.id, { onDelete: "set null" }),
    updatedById: uuid().references(() => users.id, { onDelete: "set null" }),
    /** Phase 4 reserved: spoken-word recording and downloadable edition. */
    audioUrl: text(),
    downloadMediaId: uuid().references(() => media.id, { onDelete: "set null" }),
    isDemo: boolean().notNull().default(false),
    /** Weighted: title A, subtitle/excerpt B, search text C. Author/category/tag names are added in the search query. */
    searchVector: tsvector().generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(subtitle, '') || ' ' || coalesce(excerpt, '')), 'B') || setweight(to_tsvector('english', coalesce(search_text, '')), 'C')`,
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("posts_live_idx").on(t.status, t.publishedAt),
    index("posts_scheduled_idx").on(t.scheduledAt).where(sql`status = 'scheduled'`),
    index().on(t.categoryId, t.publishedAt),
    index().on(t.collectionId),
    index("posts_search_idx").using("gin", t.searchVector),
    index("posts_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
  ],
);

export const postAuthors = pgTable(
  "post_authors",
  {
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid()
      .notNull()
      .references(() => authors.id, { onDelete: "restrict" }),
    position: smallint().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.postId, t.authorId] }), index().on(t.authorId)],
);

export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index().on(t.tagId)],
);

export const collectionPosts = pgTable(
  "collection_posts",
  {
    collectionId: uuid()
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.postId] })],
);

export const postRevisions = pgTable(
  "post_revisions",
  {
    id: id(),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    title: text().notNull(),
    contentJson: jsonb().notNull(),
    wordCount: integer().notNull().default(0),
    /** autosave | manual | publish | restore */
    reason: text().notNull().default("autosave"),
    authorId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.postId, t.createdAt)],
);

/* ───────────────────────────── Readers ───────────────────────────── */

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
);

export const readingHistory = pgTable(
  "reading_history",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    progress: smallint().notNull().default(0), // 0–100
    lastPosition: integer().notNull().default(0), // scroll offset hint (block index)
    completedAt: timestamp({ withTimezone: true }),
    firstReadAt: createdAt(),
    lastReadAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] }), index().on(t.userId, t.lastReadAt)],
);

export const reactions = pgTable(
  "reactions",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    kind: text().notNull().default("appreciate"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId, t.kind] }), index().on(t.postId)],
);

export const readerPreferences = pgTable("reader_preferences", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text().notNull().default("system"),
  textSize: smallint().notNull().default(3), // 1–5
  font: text().notNull().default("serif"),
  updatedAt: updatedAt(),
});

/* ───────────────────────────── Community ───────────────────────────── */

export const comments = pgTable(
  "comments",
  {
    id: id(),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid(), // one level of replies; enforced in the DAL
    body: text().notNull(),
    status: commentStatusEnum().notNull().default("pending"),
    spamScore: smallint().notNull().default(0),
    ipHash: text(),
    moderatedById: uuid().references(() => users.id, { onDelete: "set null" }),
    moderatedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.postId, t.status, t.createdAt), index().on(t.status, t.createdAt)],
);

export const commentReports = pgTable(
  "comment_reports",
  {
    id: id(),
    commentId: uuid()
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    reporterId: uuid().references(() => users.id, { onDelete: "set null" }),
    reason: text().notNull(),
    resolvedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.commentId, t.reporterId)],
);

export const blockedCommenters = pgTable("blocked_commenters", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: text(),
  blockedById: uuid().references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/* ───────────────────────────── Email ───────────────────────────── */

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: id(),
    email: text().notNull(),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    status: subscriberStatusEnum().notNull().default("pending"),
    confirmTokenHash: text(),
    confirmTokenExpiresAt: timestamp({ withTimezone: true }),
    /** Opaque per-subscriber token for one-click unsubscribe links (hashed). */
    unsubscribeTokenHash: text().notNull(),
    source: text().notNull(), // homepage, article, footer, account
    consentAt: timestamp({ withTimezone: true }),
    consentIpHash: text(),
    confirmedAt: timestamp({ withTimezone: true }),
    unsubscribedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("newsletter_email_lower_idx").on(sql`lower(${t.email})`), index().on(t.status)],
);

export const newsletterCampaigns = pgTable("newsletter_campaigns", {
  id: id(),
  subject: text().notNull(),
  preheader: text(),
  contentJson: jsonb().notNull().default({ type: "doc", content: [] }),
  /** all | free | premium */
  segment: text().notNull().default("all"),
  status: campaignStatusEnum().notNull().default("draft"),
  postId: uuid().references(() => posts.id, { onDelete: "set null" }),
  scheduledAt: timestamp({ withTimezone: true }),
  sentAt: timestamp({ withTimezone: true }),
  recipientCount: integer().notNull().default(0),
  createdById: uuid().references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: id(),
    /** Unique per logical email so retries and duplicate enqueues never double-send. */
    idempotencyKey: text().notNull().unique(),
    to: text().notNull(),
    template: text().notNull(),
    payload: jsonb().notNull(),
    /** transactional (verification, receipts) always goes before marketing (newsletters). */
    priority: smallint().notNull().default(5),
    marketing: boolean().notNull().default(false),
    campaignId: uuid().references(() => newsletterCampaigns.id, { onDelete: "set null" }),
    status: outboxStatusEnum().notNull().default("queued"),
    attempts: smallint().notNull().default(0),
    nextAttemptAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    providerMessageId: text(),
    lastError: text(),
    sentAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("outbox_due_idx").on(t.status, t.priority, t.nextAttemptAt), index().on(t.campaignId)],
);

export const emailEvents = pgTable(
  "email_events",
  {
    id: id(),
    providerEventId: text().notNull().unique(),
    providerMessageId: text(),
    type: text().notNull(), // delivered, bounced, complained, opened, clicked
    email: text(),
    payload: jsonb(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.providerMessageId)],
);

export const emailSuppressions = pgTable("email_suppressions", {
  email: text().primaryKey(), // lower-cased
  reason: text().notNull(), // bounce, complaint, manual
  createdAt: createdAt(),
});

export const emailTemplates = pgTable("email_templates", {
  key: text().primaryKey(), // welcome, verify_email, new_publication, ...
  subject: text().notNull(),
  /** Owner-editable intro paragraph(s), plain text with blank-line paragraphs. */
  intro: text().notNull(),
  updatedAt: updatedAt(),
});

/* ───────────────────────────── Money ───────────────────────────── */

export const plans = pgTable("plans", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  interval: planIntervalEnum().notNull(),
  amountMinor: bigint({ mode: "number" }).notNull(),
  currency: text().notNull().default("NGN"),
  benefits: jsonb().$type<string[]>().notNull().default([]),
  trialDays: smallint().notNull().default(0),
  active: boolean().notNull().default(true),
  position: smallint().notNull().default(0),
  provider: text().notNull().default("paystack"),
  providerPlanCode: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid()
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: subscriptionStatusEnum().notNull().default("incomplete"),
    provider: text().notNull().default("paystack"),
    providerCustomerCode: text(),
    providerSubscriptionCode: text(),
    providerEmailToken: text(),
    currentPeriodStart: timestamp({ withTimezone: true }),
    currentPeriodEnd: timestamp({ withTimezone: true }),
    cancelAtPeriodEnd: boolean().notNull().default(false),
    graceUntil: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    endedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.userId, t.status),
    uniqueIndex().on(t.provider, t.providerSubscriptionCode),
    index().on(t.status, t.currentPeriodEnd),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    subscriptionId: uuid().references(() => subscriptions.id, { onDelete: "set null" }),
    planId: uuid().references(() => plans.id, { onDelete: "set null" }),
    provider: text().notNull().default("paystack"),
    /** Our reference, sent to the provider; unique. */
    reference: text().notNull().unique(),
    providerTransactionId: text(),
    amountMinor: bigint({ mode: "number" }).notNull(),
    currency: text().notNull(),
    status: paymentStatusEnum().notNull().default("pending"),
    channel: text(), // card, bank_transfer, ussd, ...
    paidAt: timestamp({ withTimezone: true }),
    failureReason: text(),
    refundedMinor: bigint({ mode: "number" }).notNull().default(0),
    /** Provider receipt URL or our receipt number. Never card data. */
    receiptNumber: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId, t.createdAt), index().on(t.status, t.createdAt)],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: id(),
    provider: text().notNull(),
    /** Provider's event id, or a stable hash of the payload when the provider sends none. */
    eventId: text().notNull(),
    type: text().notNull(),
    payload: jsonb().notNull(),
    processedAt: timestamp({ withTimezone: true }),
    error: text(),
    receivedAt: createdAt(),
  },
  (t) => [uniqueIndex("payment_events_provider_event_idx").on(t.provider, t.eventId)],
);

export const entitlements = pgTable(
  "entitlements",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: entitlementSourceEnum().notNull(),
    subscriptionId: uuid().references(() => subscriptions.id, { onDelete: "cascade" }),
    /** "premium" today; room for per-collection access later. */
    scope: text().notNull().default("premium"),
    startsAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp({ withTimezone: true }),
    reason: text(),
    grantedById: uuid().references(() => users.id, { onDelete: "set null" }),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.scope, t.endsAt)],
);

export const refunds = pgTable("refunds", {
  id: id(),
  paymentId: uuid()
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  amountMinor: bigint({ mode: "number" }).notNull(),
  reason: text(),
  providerRefundId: text(),
  status: text().notNull().default("pending"),
  revokeAccess: boolean().notNull().default(false),
  createdById: uuid().references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const reconciliationIssues = pgTable("reconciliation_issues", {
  id: id(),
  kind: text().notNull(),
  detail: jsonb().notNull(),
  resolvedAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
});

/* ───────────────────────────── Site ───────────────────────────── */

export const pages = pgTable("pages", {
  id: id(),
  slug: text().notNull().unique(), // about, privacy, terms, cookies, copyright, subscription-terms, refunds
  title: text().notNull(),
  /** "legal" pages render under /legal/[slug]; "page" under /[slug]. */
  kind: text().notNull().default("page"),
  contentJson: jsonb().notNull().default({ type: "doc", content: [] }),
  html: text().notNull().default(""),
  seoDescription: text(),
  isTemplate: boolean().notNull().default(false), // legal templates awaiting lawyer review
  updatedById: uuid().references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const pageRevisions = pgTable(
  "page_revisions",
  {
    id: id(),
    pageId: uuid()
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    title: text().notNull(),
    contentJson: jsonb().notNull(),
    authorId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.pageId, t.createdAt)],
);

export const homepageSlots = pgTable("homepage_slots", {
  id: id(),
  section: homepageSectionEnum().notNull(),
  position: smallint().notNull(),
  enabled: boolean().notNull().default(true),
  /** Optional heading override shown above the section. */
  heading: text(),
  /** Hand-picked post ids for hero / editor's picks; ignored by automatic sections. */
  postIds: jsonb().$type<string[]>().notNull().default([]),
  updatedAt: updatedAt(),
});

export const siteSettings = pgTable("site_settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedById: uuid().references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: id(),
    name: text().notNull(),
    email: text().notNull(),
    /** general | collaboration | partnership | press | support */
    topic: text().notNull().default("general"),
    subject: text(),
    message: text().notNull(),
    ipHash: text(),
    readAt: timestamp({ withTimezone: true }),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.createdAt)],
);

export const featureFlags = pgTable("feature_flags", {
  key: text().primaryKey(),
  enabled: boolean().notNull().default(false),
  description: text(),
  updatedAt: updatedAt(),
});

/* ───────────────────────────── Trust ───────────────────────────── */

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    actorLabel: text(), // email at the time, kept if the user is deleted
    action: text().notNull(), // e.g. post.publish, category.delete, member.grant
    targetType: text(),
    targetId: text(),
    summary: text().notNull(),
    meta: jsonb(),
    ipHash: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.createdAt), index().on(t.targetType, t.targetId)],
);

export const consentLog = pgTable(
  "consent_log",
  {
    id: id(),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    subject: text(), // email for marketing consent; anonymous id for cookies
    kind: text().notNull(), // cookies, marketing_email
    granted: jsonb().notNull(), // { analytics: true, marketing: false } or { newsletter: true }
    source: text().notNull(),
    ipHash: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.kind, t.createdAt)],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: id(),
    /** view, read_complete, newsletter_signup, premium_conversion, search, share */
    type: text().notNull(),
    postId: uuid().references(() => posts.id, { onDelete: "set null" }),
    /** Daily-rotating anonymous visitor hash; no cookies needed. */
    visitorHash: text(),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    path: text(),
    referrerHost: text(),
    device: text(), // mobile, tablet, desktop
    country: text(),
    scrollDepth: smallint(),
    seconds: integer(),
    query: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.type, t.createdAt), index().on(t.postId, t.type)],
);

/* ───────────────────────────── Types ───────────────────────────── */

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Author = typeof authors.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type PostStatus = (typeof postStatusEnum.enumValues)[number];
export type Visibility = (typeof visibilityEnum.enumValues)[number];
