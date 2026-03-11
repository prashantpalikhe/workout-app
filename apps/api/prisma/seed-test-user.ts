import type { PrismaClient } from '../src/generated/prisma/client.js';
import * as argon2 from 'argon2';
import { estimate1RM } from '@workout/shared';

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────

const PASSWORD = 'Test1234!';

const ATHLETE1_ID = '00000000-0000-4000-a000-000000000001';
const ATHLETE1_EMAIL = 'athlete1@workout.dev';

const ATHLETE2_ID = '00000000-0000-4000-a000-000000000002';
const ATHLETE2_EMAIL = 'athlete2@workout.dev';

const TRAINER1_ID = '00000000-0000-4000-a000-000000000003';
const TRAINER1_EMAIL = 'trainer1@workout.dev';

const TRAINER2_ID = '00000000-0000-4000-a000-000000000004';
const TRAINER2_EMAIL = 'trainer2@workout.dev';

const ALL_USER_IDS = [ATHLETE1_ID, ATHLETE2_ID, TRAINER1_ID, TRAINER2_ID];

// ────────────────────────────────────────────
// Deterministic PRNG
// ────────────────────────────────────────────

function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

function createRandomHelpers(seed: number) {
  const random = createSeededRandom(seed);

  function randFloat(min: number, max: number): number {
    return min + random() * (max - min);
  }

  function randInt(min: number, max: number): number {
    return Math.floor(randFloat(min, max + 1));
  }

  return { random, randFloat, randInt };
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
  trackingType: 'WEIGHT_REPS' | 'REPS_ONLY' | 'DURATION';
  sets: number;
  repRange: [number, number];
  startWeight: number; // kg, ignored for REPS_ONLY/DURATION
  weeklyIncrement: number; // kg/week for weight, reps/week for REPS_ONLY
  maxCap: number;
  warmup: boolean;
}

// ── Athlete One: 4-day split (Push/Pull/Legs/Upper) ──

const a1PushDay: ExerciseTemplate[] = [
  { name: 'Barbell Bench Press', trackingType: 'WEIGHT_REPS', sets: 4, repRange: [5, 8], startWeight: 60, weeklyIncrement: 1.25, maxCap: 100, warmup: true },
  { name: 'Barbell Overhead Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [6, 10], startWeight: 40, weeklyIncrement: 0.75, maxCap: 65, warmup: true },
  { name: 'Incline Dumbbell Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 22, weeklyIncrement: 0.5, maxCap: 38, warmup: false },
  { name: 'Cable Tricep Pushdown', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 15], startWeight: 25, weeklyIncrement: 0.5, maxCap: 40, warmup: false },
  { name: 'Dumbbell Lateral Raise', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [12, 15], startWeight: 8, weeklyIncrement: 0.25, maxCap: 16, warmup: false },
];

const a1PullDay: ExerciseTemplate[] = [
  { name: 'Conventional Deadlift', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [3, 5], startWeight: 100, weeklyIncrement: 2.5, maxCap: 180, warmup: true },
  { name: 'Cable Lat Pulldown', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 50, weeklyIncrement: 0.75, maxCap: 75, warmup: false },
  { name: 'Barbell Bent-Over Row', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [6, 10], startWeight: 60, weeklyIncrement: 1.0, maxCap: 90, warmup: true },
  { name: 'Dumbbell Bicep Curl', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 12], startWeight: 12, weeklyIncrement: 0.25, maxCap: 20, warmup: false },
  { name: 'Cable Face Pull', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [12, 15], startWeight: 15, weeklyIncrement: 0.5, maxCap: 30, warmup: false },
];

const a1LegDay: ExerciseTemplate[] = [
  { name: 'Barbell Back Squat', trackingType: 'WEIGHT_REPS', sets: 4, repRange: [5, 8], startWeight: 80, weeklyIncrement: 2.0, maxCap: 150, warmup: true },
  { name: 'Romanian Deadlift', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 10], startWeight: 60, weeklyIncrement: 1.0, maxCap: 100, warmup: true },
  { name: 'Leg Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 12], startWeight: 120, weeklyIncrement: 2.5, maxCap: 200, warmup: false },
  { name: 'Leg Curl', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 12], startWeight: 35, weeklyIncrement: 0.5, maxCap: 55, warmup: false },
  { name: 'Calf Raise Machine', trackingType: 'WEIGHT_REPS', sets: 4, repRange: [12, 15], startWeight: 60, weeklyIncrement: 1.0, maxCap: 100, warmup: false },
];

const a1UpperDay: ExerciseTemplate[] = [
  { name: 'Dumbbell Bench Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 26, weeklyIncrement: 0.5, maxCap: 42, warmup: true },
  { name: 'Pull-Up', trackingType: 'REPS_ONLY', sets: 3, repRange: [5, 12], startWeight: 0, weeklyIncrement: 0.25, maxCap: 15, warmup: false },
  { name: 'Dumbbell Shoulder Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 18, weeklyIncrement: 0.5, maxCap: 32, warmup: false },
  { name: 'Cable Row', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 12], startWeight: 45, weeklyIncrement: 0.75, maxCap: 70, warmup: false },
  { name: 'Dip', trackingType: 'REPS_ONLY', sets: 3, repRange: [6, 15], startWeight: 0, weeklyIncrement: 0.3, maxCap: 20, warmup: false },
];

const ATHLETE1_SCHEDULE: Record<number, { name: string; template: ExerciseTemplate[] }> = {
  1: { name: 'Push Day', template: a1PushDay },   // Monday
  3: { name: 'Pull Day', template: a1PullDay },   // Wednesday
  5: { name: 'Leg Day', template: a1LegDay },     // Friday
  6: { name: 'Upper Day', template: a1UpperDay }, // Saturday
};

// ── Athlete Two: 3-day split (Upper/Lower/Full Body) — lighter weights ──

const a2UpperDay: ExerciseTemplate[] = [
  { name: 'Dumbbell Bench Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 10, weeklyIncrement: 0.5, maxCap: 22, warmup: true },
  { name: 'Cable Lat Pulldown', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 25, weeklyIncrement: 0.5, maxCap: 45, warmup: false },
  { name: 'Dumbbell Shoulder Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 8, weeklyIncrement: 0.25, maxCap: 16, warmup: false },
  { name: 'Cable Bicep Curl', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 15], startWeight: 10, weeklyIncrement: 0.25, maxCap: 20, warmup: false },
  { name: 'Cable Tricep Pushdown', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 15], startWeight: 12, weeklyIncrement: 0.5, maxCap: 25, warmup: false },
];

const a2LowerDay: ExerciseTemplate[] = [
  { name: 'Barbell Back Squat', trackingType: 'WEIGHT_REPS', sets: 4, repRange: [6, 10], startWeight: 40, weeklyIncrement: 1.25, maxCap: 80, warmup: true },
  { name: 'Romanian Deadlift', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 30, weeklyIncrement: 0.75, maxCap: 60, warmup: true },
  { name: 'Leg Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 15], startWeight: 60, weeklyIncrement: 2.0, maxCap: 120, warmup: false },
  { name: 'Leg Curl', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [10, 15], startWeight: 20, weeklyIncrement: 0.5, maxCap: 35, warmup: false },
  { name: 'Calf Raise Machine', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [12, 15], startWeight: 30, weeklyIncrement: 0.75, maxCap: 55, warmup: false },
];

const a2FullBodyDay: ExerciseTemplate[] = [
  { name: 'Barbell Overhead Press', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [6, 10], startWeight: 20, weeklyIncrement: 0.5, maxCap: 35, warmup: true },
  { name: 'Barbell Bent-Over Row', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 30, weeklyIncrement: 0.75, maxCap: 50, warmup: true },
  { name: 'Bulgarian Split Squat', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [8, 12], startWeight: 8, weeklyIncrement: 0.25, maxCap: 18, warmup: false },
  { name: 'Dumbbell Lateral Raise', trackingType: 'WEIGHT_REPS', sets: 3, repRange: [12, 15], startWeight: 4, weeklyIncrement: 0.25, maxCap: 10, warmup: false },
  { name: 'Plank', trackingType: 'DURATION', sets: 3, repRange: [30, 90], startWeight: 0, weeklyIncrement: 2, maxCap: 120, warmup: false },
];

const ATHLETE2_SCHEDULE: Record<number, { name: string; template: ExerciseTemplate[] }> = {
  1: { name: 'Upper Body', template: a2UpperDay },       // Monday
  3: { name: 'Lower Body', template: a2LowerDay },       // Wednesday
  5: { name: 'Full Body', template: a2FullBodyDay },      // Friday
};

// ────────────────────────────────────────────
// Clean Functions
// ────────────────────────────────────────────

async function cleanAllTestData(prisma: PrismaClient) {
  // Delete all test users (cascade handles profiles, settings, tokens, sessions, etc.)
  // Also delete the old test@workout.dev user if it exists (renamed to athlete1@workout.dev)
  const OLD_TEST_EMAIL = 'test@workout.dev';

  for (const userId of ALL_USER_IDS) {
    await prisma.personalRecord.deleteMany({ where: { athleteId: userId } });

    const sessions = await prisma.workoutSession.findMany({
      where: { athleteId: userId },
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
        where: { athleteId: userId },
      });
    }

    await prisma.trainerAthlete.deleteMany({
      where: { OR: [{ trainerId: userId }, { athleteId: userId }] },
    });
  }

  // Delete all test user records (cascades handle profiles, settings, tokens)
  await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { in: ALL_USER_IDS } },
        { email: OLD_TEST_EMAIL }, // clean up old email if still present
      ],
    },
  });
}

// ────────────────────────────────────────────
// User Creation
// ────────────────────────────────────────────

async function createUser(
  prisma: PrismaClient,
  opts: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    isTrainer: boolean;
    profile: {
      weight?: number;
      height?: number;
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      unitPreference?: 'METRIC' | 'IMPERIAL';
    };
  },
) {
  await prisma.user.create({
    data: {
      id: opts.id,
      email: opts.email,
      passwordHash: opts.passwordHash,
      isTrainer: opts.isTrainer,
      firstName: opts.firstName,
      lastName: opts.lastName,
    },
  });

  await prisma.athleteProfile.create({
    data: {
      userId: opts.id,
      weight: opts.profile.weight ?? null,
      height: opts.profile.height ?? null,
      unitPreference: opts.profile.unitPreference ?? 'METRIC',
      gender: opts.profile.gender ?? null,
    },
  });

  await prisma.userSettings.create({
    data: {
      userId: opts.id,
      theme: 'SYSTEM',
      restTimerEnabled: true,
      defaultRestSec: 90,
    },
  });
}

// ────────────────────────────────────────────
// Workout Session Generation (Generic)
// ────────────────────────────────────────────

async function generateWorkoutSessions(
  prisma: PrismaClient,
  opts: {
    userId: string;
    schedule: Record<number, { name: string; template: ExerciseTemplate[] }>;
    prngSeed: number;
  },
) {
  const { random, randFloat, randInt } = createRandomHelpers(opts.prngSeed);

  // Look up global exercises by name
  const exerciseNames = new Set<string>();
  for (const day of Object.values(opts.schedule)) {
    for (const ex of day.template) exerciseNames.add(ex.name);
  }

  const dbExercises = await prisma.exercise.findMany({
    where: { name: { in: [...exerciseNames] }, isGlobal: true },
    select: { id: true, name: true },
  });
  const exerciseMap = new Map(dbExercises.map((e) => [e.name, e.id]));

  for (const name of exerciseNames) {
    if (!exerciseMap.has(name)) {
      throw new Error(`Global exercise "${name}" not found. Run exercise seed first.`);
    }
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 182); // ~6 months ago

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
        reps: number | null;
        durationSec: number | null;
        completed: boolean;
        rpe: number | null;
      }>;
    }>;
  }> = [];

  const current = new Date(startDate);
  while (current <= today) {
    const dayOfWeek = current.getUTCDay();
    const daySchedule = opts.schedule[dayOfWeek];

    if (daySchedule) {
      // ~10% chance to skip (missed workout)
      if (random() < 0.1) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      const weekNumber = Math.floor(
        (current.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );

      const startHour = 7 + randFloat(0, 2);
      const durationMin = randFloat(45, 75);
      const sessionStart = new Date(current);
      sessionStart.setUTCHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
      const sessionEnd = new Date(sessionStart.getTime() + durationMin * 60 * 1000);

      const sessionExercises: typeof allSessions[0]['exercises'] = [];

      for (let i = 0; i < daySchedule.template.length; i++) {
        const tmpl = daySchedule.template[i];
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
              durationSec: null,
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
            const setWeight = roundToPlate(workingWeight + randFloat(-1.25, 1.25));

            sets.push({
              setNumber: setNumber++,
              setType: 'WORKING',
              weight: Math.max(setWeight, 2.5),
              reps,
              durationSec: null,
              completed: true,
              rpe: randInt(7, 9),
            });
          }
        } else if (tmpl.trackingType === 'REPS_ONLY') {
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
              durationSec: null,
              completed: true,
              rpe: randInt(7, 9),
            });
          }
        } else if (tmpl.trackingType === 'DURATION') {
          // Duration-based (e.g. Plank)
          const baseDuration = Math.min(
            tmpl.repRange[0] + weekNumber * tmpl.weeklyIncrement,
            tmpl.maxCap,
          );

          for (let s = 0; s < tmpl.sets; s++) {
            const fatigueRatio = s / Math.max(tmpl.sets - 1, 1);
            const duration = Math.max(
              tmpl.repRange[0],
              Math.round(baseDuration - fatigueRatio * 10 + randFloat(-5, 5)),
            );

            sets.push({
              setNumber: setNumber++,
              setType: 'WORKING',
              weight: null,
              reps: null,
              durationSec: duration,
              completed: true,
              rpe: randInt(6, 8),
            });
          }
        }

        sessionExercises.push({ exerciseId, sortOrder: i, sets });
      }

      allSessions.push({
        session: {
          athleteId: opts.userId,
          name: daySchedule.name,
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

  console.log(`  ✓ ${allSessions.length} workout sessions created for ${opts.userId.slice(-4)}`);
}

// ────────────────────────────────────────────
// PR Computation (Generic)
// ────────────────────────────────────────────

async function computeAndCreatePRs(prisma: PrismaClient, userId: string) {
  const exercisesUsed = await prisma.sessionExercise.findMany({
    where: {
      workoutSession: { athleteId: userId },
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

  const claimedSetIds = new Set<string>();
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

    const sets = await prisma.sessionSet.findMany({
      where: {
        completed: true,
        sessionExercise: {
          exerciseId,
          workoutSession: { athleteId: userId, status: 'COMPLETED' },
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
          athleteId: userId,
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
        prType: pr.prType as any,
        value: pr.value,
        achievedOn: pr.achievedOn,
        sessionSetId,
      },
    });
    created++;
  }

  console.log(`  ✓ ${created} personal records created for ${userId.slice(-4)}`);
}

// ────────────────────────────────────────────
// Trainer-Athlete Relationships
// ────────────────────────────────────────────

async function createTrainerRelationships(prisma: PrismaClient) {
  const now = new Date();

  // Trainer One → Athlete One (ACTIVE, started 5 months ago)
  const fiveMonthsAgo = new Date(now);
  fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

  await prisma.trainerAthlete.create({
    data: {
      trainerId: TRAINER1_ID,
      athleteId: ATHLETE1_ID,
      status: 'ACTIVE',
      startedAt: fiveMonthsAgo,
    },
  });

  // Trainer One → Athlete Two (ACTIVE, started 4 months ago)
  const fourMonthsAgo = new Date(now);
  fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

  await prisma.trainerAthlete.create({
    data: {
      trainerId: TRAINER1_ID,
      athleteId: ATHLETE2_ID,
      status: 'ACTIVE',
      startedAt: fourMonthsAgo,
    },
  });

  console.log('  ✓ Trainer-Athlete relationships created');
}

// ────────────────────────────────────────────
// Public export
// ────────────────────────────────────────────

export async function seedTestUser(prisma: PrismaClient) {
  console.log('Seeding test users...');

  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

  // Clean all existing test data
  await cleanAllTestData(prisma);

  // ── Athlete One ──
  console.log('\n  Creating Athlete One...');
  await createUser(prisma, {
    id: ATHLETE1_ID,
    email: ATHLETE1_EMAIL,
    passwordHash,
    firstName: 'Athlete',
    lastName: 'One',
    isTrainer: false,
    profile: { weight: 82, height: 178, gender: 'MALE' },
  });
  await generateWorkoutSessions(prisma, {
    userId: ATHLETE1_ID,
    schedule: ATHLETE1_SCHEDULE,
    prngSeed: 42,
  });
  await computeAndCreatePRs(prisma, ATHLETE1_ID);

  // ── Athlete Two ──
  console.log('\n  Creating Athlete Two...');
  await createUser(prisma, {
    id: ATHLETE2_ID,
    email: ATHLETE2_EMAIL,
    passwordHash,
    firstName: 'Athlete',
    lastName: 'Two',
    isTrainer: false,
    profile: { weight: 62, height: 165, gender: 'FEMALE' },
  });
  await generateWorkoutSessions(prisma, {
    userId: ATHLETE2_ID,
    schedule: ATHLETE2_SCHEDULE,
    prngSeed: 84,
  });
  await computeAndCreatePRs(prisma, ATHLETE2_ID);

  // ── Trainer One ──
  console.log('\n  Creating Trainer One...');
  await createUser(prisma, {
    id: TRAINER1_ID,
    email: TRAINER1_EMAIL,
    passwordHash,
    firstName: 'Trainer',
    lastName: 'One',
    isTrainer: true,
    profile: { weight: 88, height: 182, gender: 'MALE' },
  });

  // ── Trainer Two (not a trainer yet) ──
  console.log('\n  Creating Trainer Two...');
  await createUser(prisma, {
    id: TRAINER2_ID,
    email: TRAINER2_EMAIL,
    passwordHash,
    firstName: 'Trainer',
    lastName: 'Two',
    isTrainer: false,
    profile: { weight: 75, height: 175, gender: 'MALE' },
  });

  // ── Relationships ──
  await createTrainerRelationships(prisma);

  // ── Summary ──
  console.log('\n  Seed users summary:');
  console.log(`    Athlete One:  ${ATHLETE1_EMAIL} / ${PASSWORD}`);
  console.log(`    Athlete Two:  ${ATHLETE2_EMAIL} / ${PASSWORD}`);
  console.log(`    Trainer One:  ${TRAINER1_EMAIL} / ${PASSWORD} (isTrainer=true)`);
  console.log(`    Trainer Two:  ${TRAINER2_EMAIL} / ${PASSWORD} (isTrainer=false)`);
  console.log(`    Relationships: Trainer One → Athlete One (ACTIVE), Trainer One → Athlete Two (ACTIVE)`);
}
