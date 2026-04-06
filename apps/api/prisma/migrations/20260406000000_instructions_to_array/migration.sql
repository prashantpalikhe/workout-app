-- AlterTable: convert instructions from text to text[]
ALTER TABLE "exercises" ALTER COLUMN "instructions" SET DATA TYPE TEXT[] USING
  CASE
    WHEN "instructions" IS NOT NULL THEN string_to_array("instructions", E'\n')
    ELSE '{}'::TEXT[]
  END;

ALTER TABLE "exercises" ALTER COLUMN "instructions" SET DEFAULT '{}';
ALTER TABLE "exercises" ALTER COLUMN "instructions" SET NOT NULL;
