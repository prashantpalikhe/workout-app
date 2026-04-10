-- Move unit_preference from athlete_profiles to user_settings.
-- unit_preference is an app-wide display preference (trainers need it too),
-- not athlete-specific data, so it belongs on user_settings alongside theme.

-- 1. Add the new column to user_settings (nullable initially so we can backfill).
ALTER TABLE "user_settings"
  ADD COLUMN "unit_preference" "UnitPreference";

-- 2. Ensure every user has a user_settings row. Today the row is created
--    lazily on first settings read, so many users don't have one yet.
INSERT INTO "user_settings" ("id", "user_id", "updated_at")
SELECT gen_random_uuid(), u."id", NOW()
FROM "users" u
LEFT JOIN "user_settings" us ON us."user_id" = u."id"
WHERE us."id" IS NULL;

-- 3. Copy the preference across from athlete_profiles for users that have one.
UPDATE "user_settings" us
SET "unit_preference" = ap."unit_preference"
FROM "athlete_profiles" ap
WHERE us."user_id" = ap."user_id";

-- 4. Default the rest to METRIC.
UPDATE "user_settings"
SET "unit_preference" = 'METRIC'
WHERE "unit_preference" IS NULL;

-- 5. Enforce NOT NULL + default.
ALTER TABLE "user_settings"
  ALTER COLUMN "unit_preference" SET NOT NULL,
  ALTER COLUMN "unit_preference" SET DEFAULT 'METRIC';

-- 6. Drop the column from athlete_profiles.
ALTER TABLE "athlete_profiles"
  DROP COLUMN "unit_preference";
