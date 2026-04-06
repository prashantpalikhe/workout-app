# Social Features — Product Requirements Document

## Overview

Add social features to the workout app so users can follow each other, see a feed of workout activity from people they follow, and interact via high-fives and comments. This transforms the app from a solo tracking tool into a shared experience that drives accountability, inspiration, and retention.

---

## Goals

1. **Accountability** — Knowing others see your activity keeps you consistent
2. **Inspiration** — Discover exercises, programs, and training approaches from others
3. **Motivation** — Getting high-fives after a tough workout feels great
4. **Friendly competition** — Seeing others' PRs and streaks creates healthy push
5. **Retention** — Social features are the #1 driver of long-term app stickiness in fitness apps

---

## Social Model: Follow (One-Directional)

The app uses a **follow** model (like Strava/Instagram), not a mutual-friend model.

| Property | Detail |
|----------|--------|
| Direction | One-directional (asymmetric) |
| Friction | Low — following someone doesn't require them to follow back |
| Privacy | Optional approval layer (public vs private account) |
| Precedent | Strava, Instagram — proven for fitness apps |

### Why not mutual friends?

- Lower friction — no "pending friend request" limbo
- Fits the "inspiration" goal — someone can inspire you without needing to see your workouts
- Aligns with existing asymmetric trainer-athlete model
- Simpler to build — one relationship direction, no mutual handshake logic

---

## Feature Set

### 1. Profile Visibility

A new `profile_visibility` setting on `UserSettings` controls whether a user appears in search results.

| Value | Behavior |
|-------|----------|
| `discoverable` (default) | Searchable by name and email |
| `email_only` | Only findable by exact email match |
| `hidden` | Not searchable at all — can only be followed via direct link/share |

### 2. Follow Approval Setting

A new `follow_approval` setting on `UserSettings` controls how follow requests are handled.

| Value | Behavior |
|-------|----------|
| `open` (default) | Anyone can follow you instantly |
| `approval_required` | You must approve each follow request |

### 3. User Search / Discovery

Users can find other users to follow via search.

**Search by:**
- **Full name** — fuzzy/partial match (case-insensitive, matches against `first_name` and `last_name`)
- **Email** — exact match (for finding people you already know)

**Rules:**
- Results respect the target user's `profile_visibility` setting
- `hidden` users never appear in search results
- `email_only` users only appear when searched by exact email
- `discoverable` users appear in both name and email searches
- Search results show: avatar, name, bio (truncated), follower count
- Search results do NOT show workout data for non-followers

### 4. Follow / Unfollow

**Follow flow (open account):**
1. User taps "Follow" on a profile or search result
2. Relationship is immediately `active`
3. Follower begins seeing the target user's activity in their feed

**Follow flow (approval required):**
1. User taps "Follow" on a profile or search result
2. Relationship is created as `pending`
3. Target user sees a follow request notification
4. Target user approves or declines
5. If approved: status changes to `active`, follower sees activity in feed
6. If declined: relationship is deleted

**Unfollow:**
- A user can unfollow at any time — relationship is deleted
- The unfollowed user is not notified

**Remove follower:**
- A user can remove an existing follower — relationship is deleted
- The removed follower is not notified

### 5. Follower / Following Lists

Each user's profile shows:
- **Followers** count + list (users who follow them)
- **Following** count + list (users they follow)

Counts are visible to everyone. However, **individual entries in follower/following lists are filtered by the listed user's profile visibility:**
- `discoverable` users appear normally in lists
- `email_only` users appear in lists only to their own followers (not to the general public)
- `hidden` users are **redacted** from all public follower/following lists — they do not appear as entries, and the displayed count excludes them for non-followers

This prevents hidden users from being exposed through someone else's social graph.

### 6. Profile Visibility Tiers

What data is visible depends on the relationship between viewer and profile owner:

| Data | Non-follower (search/profile) | Follower (approved) | Self |
|------|-------------------------------|---------------------|------|
| Name + avatar | Yes | Yes | Yes |
| Bio | Yes | Yes | Yes |
| Follower/following counts | Yes | Yes | Yes |
| Workout count | No | Yes | Yes |
| Workout streak | No | Yes | Yes |
| Workout feed | No | Yes | Yes |
| Personal records | No | Yes | Yes |
| Body measurements | No | No | Yes |
| Programs | No | No | Yes |

**Always private:** body measurements, programs, workout notes, session RPE.

### 7. Activity Feed

The feed is the main social surface, shown on the dashboard/home page.

#### Feed Items

Feed items are generated from the activity of users you follow:

| Event | Feed Item Display |
|-------|-------------------|
| Completed workout | "[Name] completed a workout — [duration], [total volume], [exercise count] exercises" |
| New PR | "[Name] hit a new [PR type] on [Exercise]: [value]" |
| Streak milestone | "[Name] hit a [7/30/50/100/365]-day streak!" |

**Feed item details:**
- Each item shows: user avatar, user name, timestamp (relative), event-specific content
- Tapping a completed workout item shows a summary: exercise names, set counts, total volume (but NOT individual set details, weights, or notes)
- Tapping a PR item shows the exercise name, PR type, and value
- Feed is reverse-chronological
- Feed is paginated (infinite scroll)

**What is NOT shown in the feed:**
- Session or program names (feed uses generic "completed a workout" label to avoid leaking program structure)
- Individual set details (weights, reps per set)
- Session notes or RPE
- Body measurements
- Program details

#### Feed Access Control

All feed endpoints (item detail, high-fives, comments) enforce the same access rule:

- **A feed item is accessible to:** the author (self) and users who actively follow the author (`Follow.status = 'active'`)
- **Pending, declined, removed, or unfollowed users lose access immediately** — no grace period
- Non-followers who hit a feed item URL directly receive a 403
- High-fiving or commenting requires the same active-follower check (the author can also interact with their own items)

#### Feed Generation

- Feed items are created asynchronously via BullMQ when a session is completed or a PR is detected
- A `FeedItem` record is created for each event
- Feed query: fetch all `FeedItem` records where the author is someone the current user follows, ordered by `created_at` DESC
- Redis can be used for feed caching in a future optimization pass

### 8. Social Interactions

#### High-Fives

A "high-five" is the primary reaction on feed items (like Strava's "kudos").

- One high-five per user per feed item (toggle on/off)
- High-five count displayed on each feed item
- High-five is instant — no confirmation dialog
- Terminology: "High-five" (not "like" or "kudos") — fits the workout/gym context

#### Comments

Users can leave short text comments on feed items.

- Comments are displayed below the feed item, ordered chronologically
- Max comment length: 500 characters
- A user can delete their own comments
- The feed item author can delete any comment on their items
- No nested replies for MVP — flat comment thread only
- No editing comments for MVP — delete and re-post

### 9. Notifications (In-App Only)

In-app notifications for social events. No push notifications for MVP.

| Event | Notification |
|-------|-------------|
| New follower (open account) | "[Name] started following you" |
| Follow request (approval required) | "[Name] wants to follow you" |
| Follow request approved | "[Name] approved your follow request" |
| High-five on your feed item (first unread) | "[Name] high-fived your workout" |
| High-five on your feed item (batched) | "[Name] and [N] others high-fived your workout" |
| Comment on your feed item | "[Name] commented on your workout" |

**Notification behavior:**
- Notifications page accessible from the main navigation (bell icon)
- Unread count badge on the bell icon
- Mark individual notifications as read on tap
- Mark all as read action
- Notifications are not real-time for MVP (poll on page load)

**High-five batching:** The first unread high-five on a feed item creates a new notification. Subsequent unread high-fives on the same item aggregate into that notification (e.g., "Anna and 9 others high-fived your workout") rather than creating 10 separate notifications. Once the notification is read, the next high-five creates a fresh notification.

---

## Data Model

### New Entities

```
Follow {
    uuid id PK
    uuid follower_id FK → User
    uuid following_id FK → User
    enum status "pending | active"
    timestamp created_at
    timestamp updated_at
}

FeedItem {
    uuid id PK
    uuid author_id FK → User
    enum event_type "workout_completed | new_pr | streak_milestone"
    uuid session_id FK → WorkoutSession "nullable — set for workout_completed"
    uuid personal_record_id FK → PersonalRecord "nullable — set for new_pr"
    jsonb metadata "denormalized display data"
    timestamp created_at
}

HighFive {
    uuid id PK
    uuid user_id FK → User
    uuid feed_item_id FK → FeedItem
    timestamp created_at
}

Comment {
    uuid id PK
    uuid user_id FK → User
    uuid feed_item_id FK → FeedItem
    text body "max 500 chars"
    timestamp created_at
}

Notification {
    uuid id PK
    uuid user_id FK → User "recipient"
    uuid actor_id FK → User "latest actor for rendering"
    enum type "new_follower | follow_request | follow_approved | high_five | comment"
    uuid follow_id FK → Follow "nullable — set for follow-related notifications"
    uuid feed_item_id FK → FeedItem "nullable — set for high_five notifications"
    uuid comment_id FK → Comment "nullable — set for comment notifications"
    int aggregate_count "default 1 — used for batched unread high_five notifications"
    boolean read "default false"
    timestamp created_at
    timestamp updated_at
}
```

### Modified Entities

```
UserSettings {
    + enum profile_visibility "discoverable | email_only | hidden" default "discoverable"
    + enum follow_approval "open | approval_required" default "open"
    + string timezone "IANA timezone, e.g. 'Europe/Helsinki' — default 'UTC'; client should set browser timezone on onboarding/first login"
}
```

### Relationships

```
User ||--o{ Follow : "follows (as follower)"
User ||--o{ Follow : "followed by (as following)"
User ||--o{ FeedItem : "authored"
User ||--o{ HighFive : "gave"
User ||--o{ Comment : "wrote"
User ||--o{ Notification : "received"
FeedItem ||--o{ HighFive : "received"
FeedItem ||--o{ Comment : "has"
```

### Indexes

- `Follow`: unique compound index on `(follower_id, following_id)` — prevents duplicate follows
- `Follow`: index on `following_id` where `status = 'active'` — for follower list queries
- `Follow`: index on `follower_id` where `status = 'active'` — for following list queries
- `FeedItem`: index on `(author_id, created_at DESC)` — for feed queries
- `HighFive`: unique compound index on `(user_id, feed_item_id)` — one high-five per user per item
- `Notification`: index on `(user_id, read, created_at DESC)` — for notification list with unread first
- `Notification`: index on `(user_id, type, feed_item_id, read)` — for unread high-five batching lookup
- `UserSettings`: no new indexes needed (queried by `user_id` which is already indexed)

### Feed Metadata (denormalized)

The `FeedItem.metadata` JSONB column stores denormalized display data to avoid joins when rendering the feed:

```jsonc
// workout_completed (no session/program name — privacy)
{
  "duration_sec": 3600,
  "exercise_count": 6,
  "total_volume": 12500,
  "total_sets": 24
}

// new_pr
{
  "exercise_name": "Bench Press",
  "pr_type": "one_rep_max",
  "value": 120.0,
  "unit": "kg"
}

// streak_milestone
{
  "streak_days": 30
}
```

---

## API Endpoints

### Search

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/search?q=<query>&type=name\|email` | Search users by name or email |

### Follow

| Method | Path | Description |
|--------|------|-------------|
| POST | `/follows/:userId` | Follow a user (or send follow request) |
| DELETE | `/follows/:userId` | Unfollow a user |
| PATCH | `/follows/:followId/approve` | Approve a follow request |
| PATCH | `/follows/:followId/decline` | Decline a follow request (deletes it) |
| DELETE | `/followers/:userId` | Remove a follower |
| GET | `/users/:userId/followers` | List a user's followers |
| GET | `/users/:userId/following` | List who a user follows |
| GET | `/follows/requests` | List pending follow requests for current user |

### Feed

| Method | Path | Description |
|--------|------|-------------|
| GET | `/feed` | Get feed items from people you follow (paginated) |
| GET | `/feed/:feedItemId` | Get a single feed item with details |

### High-Fives

| Method | Path | Description |
|--------|------|-------------|
| POST | `/feed/:feedItemId/high-fives` | High-five a feed item |
| DELETE | `/feed/:feedItemId/high-fives` | Remove high-five from a feed item |
| GET | `/feed/:feedItemId/high-fives` | List users who high-fived an item |

### Comments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/feed/:feedItemId/comments` | Add a comment to a feed item |
| DELETE | `/comments/:commentId` | Delete a comment |
| GET | `/feed/:feedItemId/comments` | List comments on a feed item (paginated) |

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | List notifications (paginated, unread first) |
| GET | `/notifications/unread-count` | Get unread notification count |
| PATCH | `/notifications/:id/read` | Mark a notification as read |
| PATCH | `/notifications/read-all` | Mark all notifications as read |

### Profile (modified)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/:userId/profile` | Get public profile (respects visibility tiers) |

---

## Frontend Pages & Components

### New Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard / Feed | `/dashboard` | Main feed showing activity from followed users |
| User Search | `/search` | Search for users to follow |
| User Profile (public) | `/users/:id` | Public profile view with follow button |
| Followers List | `/users/:id/followers` | List of user's followers |
| Following List | `/users/:id/following` | List of users being followed |
| Follow Requests | `/follow-requests` | Pending follow requests to approve/decline |
| Notifications | `/notifications` | In-app notification center |

### New Components

| Component | Description |
|-----------|-------------|
| `FeedItem.vue` | Renders a single feed item (workout, PR, streak) |
| `FeedItemWorkout.vue` | Workout-specific feed item content |
| `FeedItemPR.vue` | PR-specific feed item content |
| `FeedItemStreak.vue` | Streak milestone feed item content |
| `HighFiveButton.vue` | High-five toggle button with count |
| `CommentSection.vue` | Comment list + input for a feed item |
| `CommentItem.vue` | Single comment display |
| `FollowButton.vue` | Follow/unfollow/pending button with state |
| `UserSearchResult.vue` | Search result card for a user |
| `NotificationItem.vue` | Single notification display |
| `NotificationBadge.vue` | Unread count badge for nav icon |
| `UserCard.vue` | Reusable user avatar + name + bio card |

### Navigation Changes

- Add a **feed/home** icon to the main navigation (first position)
- Add a **bell** icon to the header/nav bar for notifications (with unread badge)
- Add a **search** icon or entry point for user search
- User's own profile page gets follower/following counts

### Pinia Stores

| Store | Responsibilities |
|-------|-----------------|
| `useFeedStore` | Feed items, pagination, high-five toggling |
| `useFollowStore` | Follow/unfollow actions, follower/following lists, follow requests |
| `useNotificationStore` | Notifications list, unread count, mark as read |

---

## Background Jobs (BullMQ)

| Job | Trigger | Action |
|-----|---------|--------|
| `generate-feed-item` | Session completed, PR detected | Create `FeedItem` with denormalized metadata |
| `calculate-streak` | Session completed | Check consecutive workout days, create streak milestone feed item if threshold hit |
| `create-notification` | Follow, high-five, comment | Create `Notification` record for the target user |

These jobs require adding BullMQ workers to the API. The architecture specifies Redis + BullMQ in the stack, but no queue code exists yet in `apps/api` — this feature will be the first to implement the queue infrastructure (Redis connection, BullMQ producer/consumer, worker module).

---

## Streak Calculation

A streak is the number of consecutive days with at least one completed workout session.

- Calculated after each session completion
- **Timezone:** streaks are calculated in the user's local timezone (stored as IANA timezone on `UserSettings`). Timestamps remain UTC in the database, but `completed_at` is converted to the user's timezone to determine which calendar day a session falls on. This avoids "I finished at 00:10 and lost my streak" bugs.
- Milestone thresholds: 7, 30, 50, 100, 365 days
- A streak milestone feed item is created only once per threshold (don't re-create if user breaks and re-achieves)
- Streak data stored on the user profile or as a computed value (implementation decision deferred to architecture phase)
- The `timezone` field is also used by existing stats calculations (weekly stats, calendar heatmap) which currently use UTC — those should be migrated to use the user's timezone as well

---

## Current Implementation Snapshot (Pre-Social)

This section documents how streaks and PRs work in the codebase today so the social implementation can either preserve behavior intentionally or fix it explicitly.

### Current Streak Logic

- Current streaks are computed in `UserStatsService.getStats`, not stored persistently
- The service queries **distinct workout days from `DATE(workout_sessions.started_at)`**, filtered to completed sessions
- The streak algorithm runs in application code on those dates:
  - dates are expected in descending order
  - the streak must include **today or yesterday**
  - each previous date must be exactly 1 day earlier, or the streak stops
- The implementation currently uses **UTC day boundaries**, not the user's local timezone
- The weekly/monthly chart stats and calendar heatmap also bucket workouts by `started_at` in UTC
- Existing tests cover:
  - zero-state users
  - consecutive-day streaks
  - streak gaps
  - stale last workout producing streak `0`

**Known correctness gaps to fix before social streak milestones:**
- A workout that starts before midnight and completes after midnight is currently counted on the **start day**, not the completion day
- Users in non-UTC timezones can see streaks, charts, and calendar days shifted relative to their local day
- `UserSettings.timezone` does not exist yet, so the social implementation must add it together with defaults/backfill

### Current PR Logic

- PR detection runs synchronously inside `SessionsService.complete` immediately after a session is marked `COMPLETED`
- `RecordsService.detectPRs` loads all completed sets from the just-completed session, groups them by exercise, and evaluates only the PR types applicable to that exercise's tracking type
- Applicable PR types today are:
  - `WEIGHT_REPS`: `ONE_REP_MAX`, `MAX_WEIGHT`, `MAX_REPS`, `MAX_VOLUME`
  - `REPS_ONLY`: `MAX_REPS`
  - `WEIGHT_DURATION`: `MAX_WEIGHT`
  - `DURATION` and `DISTANCE_DURATION`: no PRs
- Candidate calculation rules today are:
  - `ONE_REP_MAX`: best Epley-estimated 1RM from a single completed set with positive `weight` and `reps`
  - `MAX_WEIGHT`: highest positive `weight` from a single completed set
  - `MAX_REPS`: highest positive `reps` from a single completed set
  - `MAX_VOLUME`: highest single-set `weight * reps`
- A PR row is created only when the new candidate is **strictly greater than** the saved best for that exercise and PR type. Ties do not create a new PR row
- PR history is append-only: the app stores new record rows over time rather than updating a single canonical row per PR type
- `personal_records.session_set_id` is unique, so if one set achieves multiple PRs the code assigns the set link by priority:
  - `ONE_REP_MAX`
  - `MAX_WEIGHT`
  - `MAX_VOLUME`
  - `MAX_REPS`
- Lower-priority PR rows created from the same set are still stored, but their `session_set_id` is `null`
- `achieved_on` is currently stored from the session's **`started_at` date**, not `completed_at`
- The read-only `/records/check-pr` endpoint compares a draft set against both:
  - saved PR rows for that exercise/type
  - already completed sets in the current session for the same exercise
- Exercise statistics charts derive per-session `maxWeight`, `maxReps`, `totalVolume`, and best estimated 1RM from completed sets, and they also bucket sessions by `started_at`
- Existing PR tests cover:
  - no completed sets
  - creating new PRs when no previous best exists
  - not creating PRs when candidate values are lower
  - `REPS_ONLY` and `DURATION` tracking behavior
  - zero-weight sets not producing weight-based PRs

**Known correctness gaps to fix before social PR feed items:**
- **First-time exercises should not generate PR feed items.** Currently, `detectPRs` creates a PR row when `!existingBest` (no prior record exists), which is correct for internal tracking but wrong for social announcements. The first time someone does an exercise, every set is trivially a “record.” The feed generation job must distinguish between a genuine improvement (beating a previous best) and a first-ever record. Rule: only create a `new_pr` feed item when the PR row was created by beating an existing record (`existingBest` was non-null), not when it's the user's first time logging that exercise.
- A PR achieved in a session that crosses midnight is currently dated by **session start day**, not completion day
- PR detection is not explicitly idempotent under duplicate/racing session-complete requests; social feed generation should not rely on repeated completion calls being harmless
- Batched/queued social PR generation must preserve the current “strictly greater than only” rule so equal-value ties do not create duplicate PR announcements

---

## Out of Scope for Social MVP

- **Push notifications** — in-app only for now
- **Real-time updates** — no WebSockets, feed refreshes on page load
- **Block/mute users** — defer to v2
- **Report content** — defer to v2
- **Share workout externally** — no share-to-Instagram/Twitter
- **Group workouts / challenges** — defer to v2
- **Direct messaging** — defer to v2
- **Activity privacy per-workout** — all completed workouts visible to followers (no per-session toggle)
- **Feed algorithmic ranking** — chronological only
- **Feed caching with Redis** — optimize later if needed
- **Suggested users / "People you may know"** — defer to v2

---

## Success Metrics

| Metric | Target |
|--------|--------|
| % of users who follow at least 1 person within 7 days | > 30% |
| High-fives given per active user per week | > 3 |
| Feed page visits per active user per week | > 5 |
| 30-day retention lift for socially active users vs solo users | > 15% |

---

## Resolved Decisions

1. **Feed as default home page:** Yes. The `/dashboard` route (post-login landing) becomes the social feed plus the existing "start workout" CTA. Auth redirects and nav already point to `/dashboard`, so this is minimally disruptive. The public/unauthenticated landing page is unaffected.
2. **Streak timezone handling:** User's local timezone, stored as an IANA string on `UserSettings.timezone`. Timestamps stay UTC in the DB; streak days are derived by converting `completed_at` into the user's timezone. See Streak Calculation section above.
3. **Feed item expiry:** Keep feed items indefinitely for MVP. Volume will be low at this stage and retention history is more valuable than premature pruning. Revisit archival (12-18 month cold storage, no hard deletion) only after real scale demands it.
4. **High-five notification batching:** Batched. First unread high-five on an item creates a notification; subsequent unread high-fives on the same item aggregate into it. See Notifications section above.
