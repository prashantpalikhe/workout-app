-- AlterTable
ALTER TABLE "personal_records" ADD COLUMN     "is_baseline" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark the earliest record per (athlete_id, exercise_id, pr_type) as baseline.
-- NOTE: achieved_on is DATE-only (no timestamp), so same-day tiebreaking uses id (lexicographic UUID).
-- This is approximate for records set on the same date — a best-effort backfill.
UPDATE personal_records SET is_baseline = true
WHERE id IN (
  SELECT DISTINCT ON (athlete_id, exercise_id, pr_type) id
  FROM personal_records
  ORDER BY athlete_id, exercise_id, pr_type, achieved_on ASC, id ASC
);
