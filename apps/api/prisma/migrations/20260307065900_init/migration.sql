-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ATHLETE', 'TRAINER');

-- CreateEnum
CREATE TYPE "UnitPreference" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TrainerAthleteStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ExerciseTrackingType" AS ENUM ('WEIGHT_REPS', 'REPS_ONLY', 'DURATION', 'WEIGHT_DURATION', 'DISTANCE_DURATION');

-- CreateEnum
CREATE TYPE "ExerciseEquipment" AS ENUM ('BARBELL', 'DUMBBELL', 'CABLE', 'MACHINE', 'BODYWEIGHT', 'BAND', 'KETTLEBELL', 'OTHER');

-- CreateEnum
CREATE TYPE "ExerciseMovementPattern" AS ENUM ('PUSH', 'PULL', 'SQUAT', 'HINGE', 'CARRY', 'ROTATION', 'ISOLATION');

-- CreateEnum
CREATE TYPE "ExerciseMuscleGroupRole" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "ProgramAssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkoutSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "SessionSetType" AS ENUM ('WARM_UP', 'WORKING', 'BACK_OFF', 'DROP', 'FAILURE', 'AMRAP');

-- CreateEnum
CREATE TYPE "PersonalRecordType" AS ENUM ('ONE_REP_MAX', 'MAX_REPS', 'MAX_WEIGHT', 'MAX_VOLUME');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ATHLETE',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "date_of_birth" DATE,
    "unit_preference" "UnitPreference" NOT NULL DEFAULT 'METRIC',
    "gender" "Gender",
    "bio" TEXT,
    "link" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
    "rest_timer_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_rest_sec" INTEGER NOT NULL DEFAULT 90,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurements" (
    "id" UUID NOT NULL,
    "athlete_profile_id" UUID NOT NULL,
    "measured_on" DATE NOT NULL,
    "body_weight" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hips" DOUBLE PRECISION,
    "left_arm" DOUBLE PRECISION,
    "right_arm" DOUBLE PRECISION,
    "left_thigh" DOUBLE PRECISION,
    "right_thigh" DOUBLE PRECISION,
    "left_calf" DOUBLE PRECISION,
    "right_calf" DOUBLE PRECISION,
    "neck" DOUBLE PRECISION,
    "shoulders" DOUBLE PRECISION,
    "body_fat_pct" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_athletes" (
    "id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "status" "TrainerAthleteStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "trainer_athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL,
    "created_by" UUID,
    "name" TEXT NOT NULL,
    "tracking_type" "ExerciseTrackingType" NOT NULL,
    "equipment" "ExerciseEquipment",
    "movement_pattern" "ExerciseMovementPattern",
    "image_url" TEXT,
    "instructions" TEXT,
    "video_url" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "muscle_groups" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "body_region" TEXT NOT NULL,

    CONSTRAINT "muscle_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_muscle_groups" (
    "id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "muscle_group_id" UUID NOT NULL,
    "role" "ExerciseMuscleGroupRole" NOT NULL,

    CONSTRAINT "exercise_muscle_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_folders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "folder_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_exercises" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "target_sets" INTEGER,
    "target_reps" TEXT,
    "target_rpe" DOUBLE PRECISION,
    "target_tempo" TEXT,
    "rest_sec" INTEGER,
    "notes" TEXT,

    CONSTRAINT "program_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_assignments" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    "start_date" DATE,
    "status" "ProgramAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "allow_session_deviations" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "program_assignment_id" UUID,
    "name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" "WorkoutSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "overall_rpe" INTEGER,
    "notes" TEXT,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_exercises" (
    "id" UUID NOT NULL,
    "workout_session_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "prescribed_exercise_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_substitution" BOOLEAN NOT NULL DEFAULT false,
    "substitution_reason" TEXT,

    CONSTRAINT "session_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_sets" (
    "id" UUID NOT NULL,
    "session_exercise_id" UUID NOT NULL,
    "set_number" INTEGER NOT NULL,
    "set_type" "SessionSetType" NOT NULL DEFAULT 'WORKING',
    "weight" DOUBLE PRECISION,
    "reps" INTEGER,
    "duration_sec" INTEGER,
    "distance" DOUBLE PRECISION,
    "rpe" DOUBLE PRECISION,
    "tempo" TEXT,
    "rest_sec" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "session_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "pr_type" "PersonalRecordType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "achieved_on" DATE NOT NULL,
    "session_set_id" UUID,

    CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_profiles_user_id_key" ON "athlete_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "measurements_athlete_profile_id_idx" ON "measurements"("athlete_profile_id");

-- CreateIndex
CREATE INDEX "measurements_measured_on_idx" ON "measurements"("measured_on");

-- CreateIndex
CREATE INDEX "trainer_athletes_trainer_id_idx" ON "trainer_athletes"("trainer_id");

-- CreateIndex
CREATE INDEX "trainer_athletes_athlete_id_idx" ON "trainer_athletes"("athlete_id");

-- CreateIndex
CREATE INDEX "trainer_athletes_status_idx" ON "trainer_athletes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_athletes_trainer_id_athlete_id_key" ON "trainer_athletes"("trainer_id", "athlete_id");

-- CreateIndex
CREATE INDEX "exercises_created_by_idx" ON "exercises"("created_by");

-- CreateIndex
CREATE INDEX "exercises_name_idx" ON "exercises"("name");

-- CreateIndex
CREATE INDEX "exercises_tracking_type_idx" ON "exercises"("tracking_type");

-- CreateIndex
CREATE INDEX "exercises_equipment_idx" ON "exercises"("equipment");

-- CreateIndex
CREATE INDEX "exercises_is_global_idx" ON "exercises"("is_global");

-- CreateIndex
CREATE UNIQUE INDEX "muscle_groups_name_key" ON "muscle_groups"("name");

-- CreateIndex
CREATE INDEX "exercise_muscle_groups_exercise_id_idx" ON "exercise_muscle_groups"("exercise_id");

-- CreateIndex
CREATE INDEX "exercise_muscle_groups_muscle_group_id_idx" ON "exercise_muscle_groups"("muscle_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_muscle_groups_exercise_id_muscle_group_id_key" ON "exercise_muscle_groups"("exercise_id", "muscle_group_id");

-- CreateIndex
CREATE INDEX "program_folders_user_id_idx" ON "program_folders"("user_id");

-- CreateIndex
CREATE INDEX "programs_created_by_idx" ON "programs"("created_by");

-- CreateIndex
CREATE INDEX "programs_folder_id_idx" ON "programs"("folder_id");

-- CreateIndex
CREATE INDEX "program_exercises_program_id_idx" ON "program_exercises"("program_id");

-- CreateIndex
CREATE INDEX "program_exercises_exercise_id_idx" ON "program_exercises"("exercise_id");

-- CreateIndex
CREATE INDEX "program_assignments_program_id_idx" ON "program_assignments"("program_id");

-- CreateIndex
CREATE INDEX "program_assignments_athlete_id_idx" ON "program_assignments"("athlete_id");

-- CreateIndex
CREATE INDEX "program_assignments_assigned_by_idx" ON "program_assignments"("assigned_by");

-- CreateIndex
CREATE INDEX "program_assignments_status_idx" ON "program_assignments"("status");

-- CreateIndex
CREATE INDEX "workout_sessions_athlete_id_idx" ON "workout_sessions"("athlete_id");

-- CreateIndex
CREATE INDEX "workout_sessions_program_assignment_id_idx" ON "workout_sessions"("program_assignment_id");

-- CreateIndex
CREATE INDEX "workout_sessions_status_idx" ON "workout_sessions"("status");

-- CreateIndex
CREATE INDEX "workout_sessions_started_at_idx" ON "workout_sessions"("started_at");

-- CreateIndex
CREATE INDEX "session_exercises_workout_session_id_idx" ON "session_exercises"("workout_session_id");

-- CreateIndex
CREATE INDEX "session_exercises_exercise_id_idx" ON "session_exercises"("exercise_id");

-- CreateIndex
CREATE INDEX "session_sets_session_exercise_id_idx" ON "session_sets"("session_exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_records_session_set_id_key" ON "personal_records"("session_set_id");

-- CreateIndex
CREATE INDEX "personal_records_athlete_id_idx" ON "personal_records"("athlete_id");

-- CreateIndex
CREATE INDEX "personal_records_exercise_id_idx" ON "personal_records"("exercise_id");

-- CreateIndex
CREATE INDEX "personal_records_athlete_id_exercise_id_idx" ON "personal_records"("athlete_id", "exercise_id");

-- CreateIndex
CREATE INDEX "personal_records_achieved_on_idx" ON "personal_records"("achieved_on");

-- AddForeignKey
ALTER TABLE "athlete_profiles" ADD CONSTRAINT "athlete_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_athlete_profile_id_fkey" FOREIGN KEY ("athlete_profile_id") REFERENCES "athlete_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_athletes" ADD CONSTRAINT "trainer_athletes_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_athletes" ADD CONSTRAINT "trainer_athletes_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscle_groups" ADD CONSTRAINT "exercise_muscle_groups_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscle_groups" ADD CONSTRAINT "exercise_muscle_groups_muscle_group_id_fkey" FOREIGN KEY ("muscle_group_id") REFERENCES "muscle_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_folders" ADD CONSTRAINT "program_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "program_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_program_assignment_id_fkey" FOREIGN KEY ("program_assignment_id") REFERENCES "program_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_workout_session_id_fkey" FOREIGN KEY ("workout_session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_prescribed_exercise_id_fkey" FOREIGN KEY ("prescribed_exercise_id") REFERENCES "program_exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_session_exercise_id_fkey" FOREIGN KEY ("session_exercise_id") REFERENCES "session_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_session_set_id_fkey" FOREIGN KEY ("session_set_id") REFERENCES "session_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
