import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { seedTestUser } from './seed-test-user.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ────────────────────────────────────────────
// Muscle Groups
// ────────────────────────────────────────────

const muscleGroups = [
  // Upper body – push
  { name: 'Chest', bodyRegion: 'Upper Body' },
  { name: 'Front Delts', bodyRegion: 'Upper Body' },
  { name: 'Side Delts', bodyRegion: 'Upper Body' },
  { name: 'Rear Delts', bodyRegion: 'Upper Body' },
  { name: 'Triceps', bodyRegion: 'Upper Body' },

  // Upper body – pull
  { name: 'Lats', bodyRegion: 'Upper Body' },
  { name: 'Upper Back', bodyRegion: 'Upper Body' },
  { name: 'Traps', bodyRegion: 'Upper Body' },
  { name: 'Biceps', bodyRegion: 'Upper Body' },
  { name: 'Forearms', bodyRegion: 'Upper Body' },

  // Core
  { name: 'Abs', bodyRegion: 'Core' },
  { name: 'Obliques', bodyRegion: 'Core' },
  { name: 'Lower Back', bodyRegion: 'Core' },

  // Lower body
  { name: 'Quads', bodyRegion: 'Lower Body' },
  { name: 'Hamstrings', bodyRegion: 'Lower Body' },
  { name: 'Glutes', bodyRegion: 'Lower Body' },
  { name: 'Adductors', bodyRegion: 'Lower Body' },
  { name: 'Abductors', bodyRegion: 'Lower Body' },
  { name: 'Calves', bodyRegion: 'Lower Body' },
  { name: 'Hip Flexors', bodyRegion: 'Lower Body' },

  // Other
  { name: 'Neck', bodyRegion: 'Other' },
  { name: 'Rotator Cuff', bodyRegion: 'Other' },
] as const;

// ────────────────────────────────────────────
// Global Exercises
// ────────────────────────────────────────────

type TrackingType =
  | 'WEIGHT_REPS'
  | 'REPS_ONLY'
  | 'DURATION'
  | 'WEIGHT_DURATION'
  | 'DISTANCE_DURATION';
type Equipment =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'CABLE'
  | 'MACHINE'
  | 'BODYWEIGHT'
  | 'BAND'
  | 'KETTLEBELL'
  | 'OTHER';
type Movement =
  | 'PUSH'
  | 'PULL'
  | 'SQUAT'
  | 'HINGE'
  | 'CARRY'
  | 'ROTATION'
  | 'ISOLATION';
type MuscleRole = 'PRIMARY' | 'SECONDARY';

interface ExerciseSeed {
  name: string;
  trackingType: TrackingType;
  equipment: Equipment;
  movementPattern: Movement;
  muscles: { name: string; role: MuscleRole }[];
}

const exercises: ExerciseSeed[] = [
  // ── Barbell Compounds ──────────────────────
  {
    name: 'Barbell Bench Press',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Chest', role: 'PRIMARY' },
      { name: 'Front Delts', role: 'SECONDARY' },
      { name: 'Triceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Incline Barbell Bench Press',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Chest', role: 'PRIMARY' },
      { name: 'Front Delts', role: 'PRIMARY' },
      { name: 'Triceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Barbell Back Squat',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'SQUAT',
    muscles: [
      { name: 'Quads', role: 'PRIMARY' },
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Hamstrings', role: 'SECONDARY' },
      { name: 'Lower Back', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Barbell Front Squat',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'SQUAT',
    muscles: [
      { name: 'Quads', role: 'PRIMARY' },
      { name: 'Glutes', role: 'SECONDARY' },
      { name: 'Abs', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Conventional Deadlift',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'HINGE',
    muscles: [
      { name: 'Hamstrings', role: 'PRIMARY' },
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Lower Back', role: 'PRIMARY' },
      { name: 'Quads', role: 'SECONDARY' },
      { name: 'Traps', role: 'SECONDARY' },
      { name: 'Forearms', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Romanian Deadlift',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'HINGE',
    muscles: [
      { name: 'Hamstrings', role: 'PRIMARY' },
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Lower Back', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Barbell Overhead Press',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Front Delts', role: 'PRIMARY' },
      { name: 'Side Delts', role: 'SECONDARY' },
      { name: 'Triceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Barbell Bent-Over Row',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Lats', role: 'PRIMARY' },
      { name: 'Upper Back', role: 'PRIMARY' },
      { name: 'Biceps', role: 'SECONDARY' },
      { name: 'Rear Delts', role: 'SECONDARY' },
    ],
  },

  // ── Dumbbell ───────────────────────────────
  {
    name: 'Dumbbell Bench Press',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Chest', role: 'PRIMARY' },
      { name: 'Front Delts', role: 'SECONDARY' },
      { name: 'Triceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Dumbbell Shoulder Press',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Front Delts', role: 'PRIMARY' },
      { name: 'Side Delts', role: 'SECONDARY' },
      { name: 'Triceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Dumbbell Lateral Raise',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Side Delts', role: 'PRIMARY' }],
  },
  {
    name: 'Dumbbell Bicep Curl',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Biceps', role: 'PRIMARY' },
      { name: 'Forearms', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Dumbbell Row',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Lats', role: 'PRIMARY' },
      { name: 'Upper Back', role: 'SECONDARY' },
      { name: 'Biceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Dumbbell Romanian Deadlift',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'HINGE',
    muscles: [
      { name: 'Hamstrings', role: 'PRIMARY' },
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Lower Back', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Dumbbell Lunges',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'SQUAT',
    muscles: [
      { name: 'Quads', role: 'PRIMARY' },
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Hamstrings', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Dumbbell Tricep Overhead Extension',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Triceps', role: 'PRIMARY' }],
  },

  // ── Cable ──────────────────────────────────
  {
    name: 'Cable Lat Pulldown',
    trackingType: 'WEIGHT_REPS',
    equipment: 'CABLE',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Lats', role: 'PRIMARY' },
      { name: 'Biceps', role: 'SECONDARY' },
      { name: 'Upper Back', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Cable Row',
    trackingType: 'WEIGHT_REPS',
    equipment: 'CABLE',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Upper Back', role: 'PRIMARY' },
      { name: 'Lats', role: 'PRIMARY' },
      { name: 'Biceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Cable Tricep Pushdown',
    trackingType: 'WEIGHT_REPS',
    equipment: 'CABLE',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Triceps', role: 'PRIMARY' }],
  },
  {
    name: 'Cable Face Pull',
    trackingType: 'WEIGHT_REPS',
    equipment: 'CABLE',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Rear Delts', role: 'PRIMARY' },
      { name: 'Upper Back', role: 'SECONDARY' },
      { name: 'Rotator Cuff', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Cable Fly',
    trackingType: 'WEIGHT_REPS',
    equipment: 'CABLE',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Chest', role: 'PRIMARY' }],
  },

  // ── Machine ────────────────────────────────
  {
    name: 'Leg Press',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'SQUAT',
    muscles: [
      { name: 'Quads', role: 'PRIMARY' },
      { name: 'Glutes', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Leg Extension',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Quads', role: 'PRIMARY' }],
  },
  {
    name: 'Leg Curl',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Hamstrings', role: 'PRIMARY' }],
  },
  {
    name: 'Calf Raise Machine',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Calves', role: 'PRIMARY' }],
  },
  {
    name: 'Chest Press Machine',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Chest', role: 'PRIMARY' },
      { name: 'Triceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Hip Abductor Machine',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Abductors', role: 'PRIMARY' },
      { name: 'Glutes', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Hip Adductor Machine',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Adductors', role: 'PRIMARY' }],
  },

  // ── Bodyweight ─────────────────────────────
  {
    name: 'Pull-Up',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Lats', role: 'PRIMARY' },
      { name: 'Biceps', role: 'SECONDARY' },
      { name: 'Upper Back', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Chin-Up',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Lats', role: 'PRIMARY' },
      { name: 'Biceps', role: 'PRIMARY' },
      { name: 'Upper Back', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Push-Up',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Chest', role: 'PRIMARY' },
      { name: 'Triceps', role: 'SECONDARY' },
      { name: 'Front Delts', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Dip',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Chest', role: 'PRIMARY' },
      { name: 'Triceps', role: 'PRIMARY' },
      { name: 'Front Delts', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Plank',
    trackingType: 'DURATION',
    equipment: 'BODYWEIGHT',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Abs', role: 'PRIMARY' },
      { name: 'Obliques', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Hanging Leg Raise',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Abs', role: 'PRIMARY' },
      { name: 'Hip Flexors', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Bodyweight Squat',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'SQUAT',
    muscles: [
      { name: 'Quads', role: 'PRIMARY' },
      { name: 'Glutes', role: 'SECONDARY' },
    ],
  },

  // ── Kettlebell ─────────────────────────────
  {
    name: 'Kettlebell Swing',
    trackingType: 'WEIGHT_REPS',
    equipment: 'KETTLEBELL',
    movementPattern: 'HINGE',
    muscles: [
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Hamstrings', role: 'PRIMARY' },
      { name: 'Lower Back', role: 'SECONDARY' },
      { name: 'Abs', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Kettlebell Goblet Squat',
    trackingType: 'WEIGHT_REPS',
    equipment: 'KETTLEBELL',
    movementPattern: 'SQUAT',
    muscles: [
      { name: 'Quads', role: 'PRIMARY' },
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Abs', role: 'SECONDARY' },
    ],
  },

  // ── Carry ──────────────────────────────────
  {
    name: "Farmer's Walk",
    trackingType: 'DISTANCE_DURATION',
    equipment: 'DUMBBELL',
    movementPattern: 'CARRY',
    muscles: [
      { name: 'Forearms', role: 'PRIMARY' },
      { name: 'Traps', role: 'PRIMARY' },
      { name: 'Abs', role: 'SECONDARY' },
    ],
  },

  // ── More Barbell ───────────────────────────
  {
    name: 'Decline Barbell Bench Press',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Chest', role: 'PRIMARY' },
      { name: 'Front Delts', role: 'SECONDARY' },
      { name: 'Triceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Sumo Deadlift',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'HINGE',
    muscles: [
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Hamstrings', role: 'PRIMARY' },
      { name: 'Quads', role: 'SECONDARY' },
      { name: 'Lower Back', role: 'SECONDARY' },
      { name: 'Adductors', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Barbell Hip Thrust',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'HINGE',
    muscles: [
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Hamstrings', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Barbell Shrug',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Traps', role: 'PRIMARY' }],
  },
  {
    name: 'Barbell Bicep Curl',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Biceps', role: 'PRIMARY' },
      { name: 'Forearms', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Close-Grip Barbell Bench Press',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Triceps', role: 'PRIMARY' },
      { name: 'Chest', role: 'SECONDARY' },
      { name: 'Front Delts', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Skull Crusher',
    trackingType: 'WEIGHT_REPS',
    equipment: 'BARBELL',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Triceps', role: 'PRIMARY' }],
  },

  // ── More Dumbbell ──────────────────────────
  {
    name: 'Incline Dumbbell Press',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Chest', role: 'PRIMARY' },
      { name: 'Front Delts', role: 'PRIMARY' },
      { name: 'Triceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Incline Dumbbell Fly',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Chest', role: 'PRIMARY' }],
  },
  {
    name: 'Hammer Curl',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Biceps', role: 'PRIMARY' },
      { name: 'Forearms', role: 'PRIMARY' },
    ],
  },
  {
    name: 'Concentration Curl',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Biceps', role: 'PRIMARY' }],
  },
  {
    name: 'Dumbbell Rear Delt Fly',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Rear Delts', role: 'PRIMARY' },
      { name: 'Upper Back', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Bulgarian Split Squat',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'SQUAT',
    muscles: [
      { name: 'Quads', role: 'PRIMARY' },
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Hamstrings', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Dumbbell Step-Up',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'SQUAT',
    muscles: [
      { name: 'Quads', role: 'PRIMARY' },
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Hamstrings', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Dumbbell Shrug',
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Traps', role: 'PRIMARY' }],
  },

  // ── More Cable ─────────────────────────────
  {
    name: 'Cable Bicep Curl',
    trackingType: 'WEIGHT_REPS',
    equipment: 'CABLE',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Biceps', role: 'PRIMARY' },
      { name: 'Forearms', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Cable Lateral Raise',
    trackingType: 'WEIGHT_REPS',
    equipment: 'CABLE',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Side Delts', role: 'PRIMARY' }],
  },
  {
    name: 'Cable Crossover',
    trackingType: 'WEIGHT_REPS',
    equipment: 'CABLE',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Chest', role: 'PRIMARY' }],
  },
  {
    name: 'Straight-Arm Pulldown',
    trackingType: 'WEIGHT_REPS',
    equipment: 'CABLE',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Lats', role: 'PRIMARY' }],
  },

  // ── More Machine ──────────────────────────
  {
    name: 'Pec Deck / Chest Fly Machine',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Chest', role: 'PRIMARY' }],
  },
  {
    name: 'Seated Cable Row Machine',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Upper Back', role: 'PRIMARY' },
      { name: 'Lats', role: 'PRIMARY' },
      { name: 'Biceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Lat Pulldown Machine',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Lats', role: 'PRIMARY' },
      { name: 'Biceps', role: 'SECONDARY' },
      { name: 'Upper Back', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Seated Calf Raise',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Calves', role: 'PRIMARY' }],
  },
  {
    name: 'Preacher Curl Machine',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Biceps', role: 'PRIMARY' },
      { name: 'Forearms', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Smith Machine Bench Press',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Chest', role: 'PRIMARY' },
      { name: 'Front Delts', role: 'SECONDARY' },
      { name: 'Triceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Smith Machine Squat',
    trackingType: 'WEIGHT_REPS',
    equipment: 'MACHINE',
    movementPattern: 'SQUAT',
    muscles: [
      { name: 'Quads', role: 'PRIMARY' },
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Hamstrings', role: 'SECONDARY' },
    ],
  },

  // ── More Bodyweight ────────────────────────
  {
    name: 'Pike Push-Up',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Front Delts', role: 'PRIMARY' },
      { name: 'Side Delts', role: 'SECONDARY' },
      { name: 'Triceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Incline Push-Up',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Chest', role: 'PRIMARY' },
      { name: 'Triceps', role: 'SECONDARY' },
      { name: 'Front Delts', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Reverse Crunch',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Abs', role: 'PRIMARY' },
      { name: 'Hip Flexors', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Bicycle Crunch',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Abs', role: 'PRIMARY' },
      { name: 'Obliques', role: 'PRIMARY' },
    ],
  },
  {
    name: 'Glute Bridge',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'HINGE',
    muscles: [
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Hamstrings', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Bodyweight Calf Raise',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'ISOLATION',
    muscles: [{ name: 'Calves', role: 'PRIMARY' }],
  },
  {
    name: 'Pistol Squat',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'SQUAT',
    muscles: [
      { name: 'Quads', role: 'PRIMARY' },
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Hamstrings', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Australian Pull-Up',
    trackingType: 'REPS_ONLY',
    equipment: 'BODYWEIGHT',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Lats', role: 'PRIMARY' },
      { name: 'Biceps', role: 'SECONDARY' },
      { name: 'Upper Back', role: 'SECONDARY' },
    ],
  },

  // ── More Kettlebell ────────────────────────
  {
    name: 'Kettlebell Turkish Get-Up',
    trackingType: 'WEIGHT_REPS',
    equipment: 'KETTLEBELL',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Front Delts', role: 'PRIMARY' },
      { name: 'Abs', role: 'PRIMARY' },
      { name: 'Glutes', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Kettlebell Row',
    trackingType: 'WEIGHT_REPS',
    equipment: 'KETTLEBELL',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Lats', role: 'PRIMARY' },
      { name: 'Upper Back', role: 'PRIMARY' },
      { name: 'Biceps', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Kettlebell Clean and Press',
    trackingType: 'WEIGHT_REPS',
    equipment: 'KETTLEBELL',
    movementPattern: 'PUSH',
    muscles: [
      { name: 'Front Delts', role: 'PRIMARY' },
      { name: 'Glutes', role: 'PRIMARY' },
      { name: 'Quads', role: 'SECONDARY' },
      { name: 'Triceps', role: 'SECONDARY' },
    ],
  },

  // ── Band ───────────────────────────────────
  {
    name: 'Band Pull-Apart',
    trackingType: 'REPS_ONLY',
    equipment: 'BAND',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Rear Delts', role: 'PRIMARY' },
      { name: 'Upper Back', role: 'SECONDARY' },
      { name: 'Rotator Cuff', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Band Face Pull',
    trackingType: 'REPS_ONLY',
    equipment: 'BAND',
    movementPattern: 'PULL',
    muscles: [
      { name: 'Rear Delts', role: 'PRIMARY' },
      { name: 'Upper Back', role: 'SECONDARY' },
      { name: 'Rotator Cuff', role: 'SECONDARY' },
    ],
  },
];

// ────────────────────────────────────────────
// Seed Functions
// ────────────────────────────────────────────

async function seedMuscleGroups() {
  console.log('Seeding muscle groups...');

  for (const mg of muscleGroups) {
    await prisma.muscleGroup.upsert({
      where: { name: mg.name },
      update: { bodyRegion: mg.bodyRegion },
      create: mg,
    });
  }

  const count = await prisma.muscleGroup.count();
  console.log(`  ✓ ${count} muscle groups`);
}

async function seedExercises() {
  console.log('Seeding global exercises...');

  // Build a lookup map: muscle group name → id
  const allMuscleGroups = await prisma.muscleGroup.findMany();
  const mgMap = new Map(allMuscleGroups.map((mg) => [mg.name, mg.id]));

  for (const ex of exercises) {
    // Upsert the exercise (match on name + isGlobal)
    const existing = await prisma.exercise.findFirst({
      where: { name: ex.name, isGlobal: true },
    });

    let exerciseId: string;

    if (existing) {
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          trackingType: ex.trackingType,
          equipment: ex.equipment,
          movementPattern: ex.movementPattern,
        },
      });
      exerciseId = existing.id;
    } else {
      const created = await prisma.exercise.create({
        data: {
          name: ex.name,
          trackingType: ex.trackingType,
          equipment: ex.equipment,
          movementPattern: ex.movementPattern,
          isGlobal: true,
        },
      });
      exerciseId = created.id;
    }

    // Sync muscle group associations
    // Delete existing associations and recreate (simpler than diffing)
    await prisma.exerciseMuscleGroup.deleteMany({
      where: { exerciseId },
    });

    for (const muscle of ex.muscles) {
      const muscleGroupId = mgMap.get(muscle.name);
      if (!muscleGroupId) {
        console.warn(
          `  ⚠ Muscle group "${muscle.name}" not found, skipping for "${ex.name}"`,
        );
        continue;
      }
      await prisma.exerciseMuscleGroup.create({
        data: {
          exerciseId,
          muscleGroupId,
          role: muscle.role,
        },
      });
    }
  }

  const count = await prisma.exercise.count({ where: { isGlobal: true } });
  console.log(`  ✓ ${count} global exercises`);
}

// ────────────────────────────────────────────
// Main
// ────────────────────────────────────────────

async function main() {
  console.log('Starting seed...\n');

  await seedMuscleGroups();
  await seedExercises();
  await seedTestUser(prisma);

  console.log('\nSeed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
