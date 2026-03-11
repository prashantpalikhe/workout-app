-- AlterEnum: Add DISCONNECTED to TrainerAthleteStatus
ALTER TYPE "TrainerAthleteStatus" ADD VALUE 'DISCONNECTED';

-- Step 1: Add is_trainer column with default false
ALTER TABLE "users" ADD COLUMN "is_trainer" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Migrate data — set is_trainer = true for users with role = 'TRAINER'
UPDATE "users" SET "is_trainer" = true WHERE "role" = 'TRAINER';

-- Step 3: Drop the old role column
ALTER TABLE "users" DROP COLUMN "role";

-- Step 4: Drop the old enum
DROP TYPE "UserRole";

-- AlterTable: Add logged_by to workout_sessions
ALTER TABLE "workout_sessions" ADD COLUMN "logged_by" UUID;

-- CreateTable: trainer_invites
CREATE TABLE "trainer_invites" (
    "id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "used_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainer_invites_token_key" ON "trainer_invites"("token");

-- CreateIndex
CREATE INDEX "trainer_invites_trainer_id_idx" ON "trainer_invites"("trainer_id");

-- CreateIndex
CREATE INDEX "trainer_invites_token_idx" ON "trainer_invites"("token");

-- CreateIndex
CREATE INDEX "workout_sessions_logged_by_idx" ON "workout_sessions"("logged_by");

-- AddForeignKey
ALTER TABLE "trainer_invites" ADD CONSTRAINT "trainer_invites_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_invites" ADD CONSTRAINT "trainer_invites_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
