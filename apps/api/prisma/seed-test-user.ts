import type { PrismaClient } from '../src/generated/prisma/client.js';
import * as argon2 from 'argon2';
import { estimate1RM } from '@workout/shared';

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────

const TEST_USER_ID = '00000000-0000-4000-a000-000000000001';
const TEST_USER_EMAIL = 'test@workout.dev';
const TEST_USER_PASSWORD = 'Test1234!';

// Deterministic PRNG (linear congruential generator)
function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

const random = createSeededRandom(42);

/** Random float in [min, max) */
function randFloat(min: number, max: number): number {
  return min + random() * (max - min);
}

/** Random int in [min, max] inclusive */
function randInt(min: number, max: number): number {
  return Math.floor(randFloat(min, max + 1));
}

/** Round to nearest 2.5 (barbell plates) */
function roundToPlate(weight: number): number {
  return Math.round(weight / 2.5) * 2.5;
}

// ────────────────────────────────────────────
// Workout Templates
// ────────────────────────────────────────────

interface ExerciseTemplate {
  name: string; // must match global exercise name exactly
  trackingType: 'WEIGHT_REPS' | 'REPS_ONLY';
  sets: number;
  repRange: [number, number];
  startWeight: number; // kg, ignored for REPS_ONLY
  weeklyIncrement: number; // kg/week for weight, reps/week for REPS_ONLY
  maxCap: number;
  warmup: boolean;
}

// Day A — Push (Monday)
const pushDay: ExerciseTemplate[] = [
  { name: 'Barbell Bench Press', trackingType: 'WEIGHT_REPS', sets: 4, repRange: [5, 8], startWeight: 60, weeklyIncrement: 1.25, maxCap: 100, warmup: true },
  { name: 'Barbell Overhead Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [6, 10], startWeight: 40, weeklyIncrement: 0.75, maxCap: 65, warmup: true },
  { name: 'Incline Dumbbell Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 22, weeklyIncrement: 0.5, maxCap: 38, warmup: false },
  { name: 'Cable Tricep Pushdown', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 15], startWeight: 25, weeklyIncrement: 0.5, maxCap: 40, warmup: false },
  { name: 'Dumbbell Lateral Raise', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [12, 15], startWeight: 8, weeklyIncrement: 0.25, maxCap: 16, warmup: false },
];

// Day B — Pull (Wednesday)
const pullDay: ExerciseTemplate[] = [
  { name: 'Conventional Deadlift', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [3, 5], startWeight: 100, weeklyIncrement: 2.5, maxCap: 180, warmup: true },
  { name: 'Cable Lat Pulldown', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 50, weeklyIncrement: 0.75, maxCap: 75, warmup: false },
  { name: 'Barbell Bent-Over Row', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [6, 10], startWeight: 60, weeklyIncrement: 1.0, maxCap: 90, warmup: true },
  { name: 'Dumbbell Bicep Curl', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 12], startWeight: 12, weeklyIncrement: 0.25, maxCap: 20, warmup: false },
  { name: 'Cable Face Pull', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [12, 15], startWeight: 15, weeklyIncrement: 0.5, maxCap: 30, warmup: false },
];

// Day C — Legs (Friday)
const legDay: ExerciseTemplate[] = [
  { name: 'Barbell Back Squat', trackingType: 'WEIGHT_REPS', sets: 4, repRange: [5, 8], startWeight: 80, weeklyIncrement: 2.0, maxCap: 150, warmup: true },
  { name: 'Romanian Deadlift', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 10], startWeight: 60, weeklyIncrement: 1.0, maxCap: 100, warmup: true },
  { name: 'Leg Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 12], startWeight: 120, weeklyIncrement: 2.5, maxCap: 200, warmup: false },
  { name: 'Leg Curl', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 12], startWeight: 35, weeklyIncrement: 0.5, maxCap: 55, warmup: false },
  { name: 'Calf Raise Machine', trackingType: 'WEIGHT_REPS', sets: 4, repRange: [12, 15], startWeight: 60, weeklyIncrement: 1.0, maxCap: 100, warmup: false },
];

// Day D — Upper (Saturday)
const upperDay: ExerciseTemplate[] = [
  { name: 'Dumbbell Bench Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 26, weeklyIncrement: 0.5, maxCap: 42, warmup: true },
  { name: 'Pull-Up', trackingType: 'REPS_ONLY', sets: 3, repRange: [5, 12], startWeight: 0, weeklyIncrement: 0.25, maxCap: 15, warmup: false },
  { name: 'Dumbbell Shoulder Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 18, weeklyIncrement: 0.5, maxCap: 32, warmup: false },
  { name: 'Cable Row', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 12], startWeight: 45, weeklyIncrement: 0.75, maxCap: 70, warmup: false },
  { name: 'Dip', trackingType: 'REPS_ONLY', sets: 3, repRange: [6, 15], startWeight: 0, weeklyIncrement: 0.3, maxCap: 20, warmup: false },
];

// Map day-of-week (0=Sun) to template
const SCHEDULE: Record<number, { name: string; template: ExerciseTemplate[] }> = {
  1: { name: 'Push Day', template: pushDay },   // Monday
  3: { name: 'Pull Day', template: pullDay },   // Wednesday
  5: { name: 'Leg Day', template: legDay },     // Friday
  6: { name: 'Upper Day', template: upperDay }, // Saturday
};

// ────────────────────────────────────────────
// Seed Functions
// ────────────────────────────────────────────

async function cleanTestUserData(prisma: PrismaClient) {
  // Delete in reverse dependency order
  await prisma.personalRecord.deleteMany({ where: { athleteId: TEST_USER_ID } });

  const sessions = await prisma.workoutSession.findMany({
    where: { athleteId: TEST_USER_ID },
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);

  if (sessionIds.length > 0) {
    const exercises = await prisma.sessionExercise.findMany({
      where: { workoutSessionId: { in: sessionIds } },
      select: { id: true },
    });
    const exerciseIds = exercises.map((e) => e.id);

    if (exerciseIds.length > 0) {
      await prisma.sessionSet.deleteMany({
        where: { sessionExerciseId: { in: exerciseIds } },
      });
    }
    await prisma.sessionExercise.deleteMany({
      where: { workoutSessionId: { in: sessionIds } },
    });
    await prisma.workoutSession.deleteMany({
      where: { athleteId: TEST_USER_ID },
    });
  }
}

async function createTestUser(prisma: PrismaClient) {
  const passwordHash = await argon2.hash(TEST_USER_PASSWORD, { type: argon2.argon2id });

  await prisma.user.upsert({
    where: { email: TEST_USER_EMAIL },
    update: { passwordHash, firstName: 'Test', lastName: 'User' },
    create: {
      id: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      passwordHash,
      role: 'ATHLETE',
      firstName: 'Test',
      lastName: 'User',
    },
  });

  // Profile
  await prisma.athleteProfile.upsert({
    where: { userId: TEST_USER_ID },
    update: {},
    create: {
      userId: TEST_USER_ID,
      weight: 82,
      height: 178,
      unitPreference: 'METRIC',
      gender: 'MALE',
    },
  });

  // Settings
  await prisma.userSettings.upsert({
    where: { userId: TEST_USER_ID },
    update: {},
    create: {
      userId: TEST_USER_ID,
      theme: 'SYSTEM',
      restTimerEnabled: true,
      defaultRestSec: 90,
    },
  });
}

async function generateWorkoutSessions(prisma: PrismaClient) {
  // Look up global exercises by name
  const exerciseNames = new Set<string>();
  for (const day of [pushDay, pullDay, legDay, upperDay]) {
    for (const ex of day) exerciseNames.add(ex.name);
  }

  const dbExercises = await prisma.exercise.findMany({
    where: { name: { in: [...exerciseNames] }, isGlobal: true },
    select: { id: true, name: true },
  });
  const exerciseMap = new Map(dbExercises.map((e) => [e.name, e.id]));

  // Verify all exercises exist
  for (const name of exerciseNames) {
    if (!exerciseMap.has(name)) {
      throw new Error(`Global exercise "${name}" not found. Run exercise seed first.`);
    }
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 182); // ~6 months ago

  // Collect all session data for batch creation
  const allSessions: Array<{
    session: {
      athleteId: string;
      name: string;
      startedAt: Date;
      completedAt: Date;
      status: 'COMPLETED';
      overallRpe: number;
    };
    exercises: Array<{
      exerciseId: string;
      sortOrder: number;
      sets: Array<{
        setNumber: number;
        setType: 'WARM_UP' | 'WORKING';
        weight: number | null;
        reps: number;
        completed: boolean;
        rpe: number | null;
      }>;
    }>;
  }> = [];

  // Iterate each day from startDate to today
  const current = new Date(startDate);
  while (current <= today) {
    const dayOfWeek = current.getUTCDay();
    const schedule = SCHEDULE[dayOfWeek];

    if (schedule) {
      // ~10% chance to skip (missed workout)
      if (random() < 0.1) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      const weekNumber = Math.floor(
        (current.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );

      // Session timing
      const startHour = 7 + randFloat(0, 2);
      const durationMin = randFloat(45, 75);
      const sessionStart = new Date(current);
      sessionStart.setUTCHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
      const sessionEnd = new Date(sessionStart.getTime() + durationMin * 60 * 1000);

      const sessionExercises: typeof allSessions[0]['exercises'] = [];

      for (let i = 0; i < schedule.template.length; i++) {
        const tmpl = schedule.template[i];
        const exerciseId = exerciseMap.get(tmpl.name)!;
        const sets: typeof sessionExercises[0]['sets'] = [];
        let setNumber = 1;

        if (tmpl.trackingType === 'WEIGHT_REPS') {
          const baseWeight = Math.min(
            tmpl.startWeight + weekNumber * tmpl.weeklyIncrement,
            tmpl.maxCap,
          );
          const jitter = randFloat(-2.5, 2.5);
          const workingWeight = roundToPlate(baseWeight + jitter);

          // Optional warm-up set
          if (tmpl.warmup) {
            sets.push({
              setNumber: setNumber++,
              setType: 'WARM_UP',
              weight: roundToPlate(workingWeight * randFloat(0.5, 0.6)),
              reps: randInt(8, 12),
              completed: true,
              rpe: null,
            });
          }

          // Working sets — reps decrease across sets (fatigue)
          for (let s = 0; s < tmpl.sets; s++) {
            const repSpread = tmpl.repRange[1] - tmpl.repRange[0];
            const fatigueRatio = s / Math.max(tmpl.sets - 1, 1);
            const targetReps = Math.round(
              tmpl.repRange[1] - fatigueRatio * repSpread + randFloat(-0.5, 0.5),
            );
            const reps = Math.max(tmpl.repRange[0], Math.min(tmpl.repRange[1], targetReps));

            // Slight weight variation per set
            const setWeight = roundToPlate(workingWeight + randFloat(-1.25, 1.25));

            sets.push({
              setNumber: setNumber++,
              setType: 'WORKING',
              weight: Math.max(setWeight, 2.5), // floor at 2.5kg
              reps,
              completed: true,
              rpe: randInt(7, 9),
            });
          }
        } else {
          // REPS_ONLY (Pull-ups, Dips)
          const baseReps = Math.min(
            tmpl.repRange[0] + weekNumber * tmpl.weeklyIncrement,
            tmpl.maxCap,
          );

          for (let s = 0; s < tmpl.sets; s++) {
            const fatigueRatio = s / Math.max(tmpl.sets - 1, 1);
            const reps = Math.max(
              tmpl.repRange[0],
              Math.round(baseReps - fatigueRatio * 2 + randFloat(-1, 1)),
            );

            sets.push({
              setNumber: setNumber++,
              setType: 'WORKING',
              weight: null,
              reps,
              completed: true,
              rpe: randInt(7, 9),
            });
          }
        }

        sessionExercises.push({ exerciseId, sortOrder: i, sets });
      }

      allSessions.push({
        session: {
          athleteId: TEST_USER_ID,
          name: schedule.name,
          startedAt: sessionStart,
          completedAt: sessionEnd,
          status: 'COMPLETED',
          overallRpe: randInt(6, 9),
        },
        exercises: sessionExercises,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  // Batch create in weekly chunks
  const CHUNK_SIZE = 4;
  for (let i = 0; i < allSessions.length; i += CHUNK_SIZE) {
    const chunk = allSessions.slice(i, i + CHUNK_SIZE);

    for (const { session, exercises } of chunk) {
      const created = await prisma.workoutSession.create({
        data: session,
      });

      for (const ex of exercises) {
        const createdEx = await prisma.sessionExercise.create({
          data: {
            workoutSessionId: created.id,
            exerciseId: ex.exerciseId,
            sortOrder: ex.sortOrder,
          },
        });

        if (ex.sets.length > 0) {
          await prisma.sessionSet.createMany({
            data: ex.sets.map((s) => ({
              sessionExerciseId: createdEx.id,
              ...s,
            })),
          });
        }
      }
    }
  }

  console.log(`  ✓ ${allSessions.length} workout sessions created`);
}

async function computeAndCreatePRs(prisma: PrismaClient) {
  // Get all exercises used by the test user with their tracking types
  const exercisesUsed = await prisma.sessionExercise.findMany({
    where: {
      workoutSession: { athleteId: TEST_USER_ID },
    },
    select: {
      exerciseId: true,
      exercise: { select: { trackingType: true } },
    },
    distinct: ['exerciseId'],
  });

  const PR_TYPES_BY_TRACKING: Record<string, string[]> = {
    WEIGHT_REPS: ['ONE_REP_MAX', 'MAX_WEIGHT', 'MAX_REPS', 'MAX_VOLUME'],
    REPS_ONLY: ['MAX_REPS'],
    WEIGHT_DURATION: ['MAX_WEIGHT'],
  };

  const PR_TYPE_PRIORITY = ['ONE_REP_MAX', 'MAX_WEIGHT', 'MAX_VOLUME', 'MAX_REPS'];

  // Track which sessionSetIds are already claimed by a PR
  const claimedSetIds = new Set<string>();
  // Collect all PRs, then sort by priority before inserting
  const prCandidates: Array<{
    athleteId: string;
    exerciseId: string;
    prType: string;
    value: number;
    achievedOn: Date;
    sessionSetId: string | null;
    priority: number;
  }> = [];

  for (const { exerciseId, exercise } of exercisesUsed) {
    const prTypes = PR_TYPES_BY_TRACKING[exercise.trackingType] ?? [];
    if (prTypes.length === 0) continue;

    // Get all completed sets for this exercise
    const sets = await prisma.sessionSet.findMany({
      where: {
        completed: true,
        sessionExercise: {
          exerciseId,
          workoutSession: { athleteId: TEST_USER_ID, status: 'COMPLETED' },
        },
      },
      include: {
        sessionExercise: {
          include: { workoutSession: { select: { startedAt: true } } },
        },
      },
    });

    for (const prType of prTypes) {
      let bestValue = -1;
      let bestSet: (typeof sets)[0] | null = null;

      for (const set of sets) {
        let value = 0;
        switch (prType) {
          case 'ONE_REP_MAX':
            if (set.weight && set.reps && set.weight > 0 && set.reps > 0) {
              value = estimate1RM(set.weight, set.reps);
            }
            break;
          case 'MAX_WEIGHT':
            value = set.weight ?? 0;
            break;
          case 'MAX_REPS':
            value = set.reps ?? 0;
            break;
          case 'MAX_VOLUME':
            value = (set.weight ?? 0) * (set.reps ?? 0);
            break;
        }

        if (value > bestValue) {
          bestValue = value;
          bestSet = set;
        }
      }

      if (bestSet && bestValue > 0) {
        prCandidates.push({
          athleteId: TEST_USER_ID,
          exerciseId,
          prType,
          value: Math.round(bestValue * 100) / 100,
          achievedOn: bestSet.sessionExercise.workoutSession.startedAt,
          sessionSetId: bestSet.id,
          priority: PR_TYPE_PRIORITY.indexOf(prType),
        });
      }
    }
  }

  // Sort by priority (lower index = higher priority) so higher-priority PRs claim sessionSetIds first
  prCandidates.sort((a, b) => a.priority - b.priority);

  let created = 0;
  for (const pr of prCandidates) {
    let sessionSetId: string | null = null;
    if (pr.sessionSetId && !claimedSetIds.has(pr.sessionSetId)) {
      sessionSetId = pr.sessionSetId;
      claimedSetIds.add(pr.sessionSetId);
    }

    await prisma.personalRecord.create({
      data: {
        athleteId: pr.athleteId,
        exerciseId: pr.exerciseId,
        prType: pr.prType,
        value: pr.value,
        achievedOn: pr.achievedOn,
        sessionSetId,
      },
    });
    created++;
  }

  console.log(`  ✓ ${created} personal records created`);
}

// ────────────────────────────────────────────
// Public export
// ────────────────────────────────────────────

export async function seedTestUser(prisma: PrismaClient) {
  console.log('Seeding test user...');

  await cleanTestUserData(prisma);
  await createTestUser(prisma);
  await generateWorkoutSessions(prisma);
  await computeAndCreatePRs(prisma);

  console.log(`  ✓ Test user: ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD}`);
}
