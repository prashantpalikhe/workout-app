// Global exercise catalog — seeded into DB via prisma/seed.ts and used by
// prisma/scripts/sync-exercise-images.ts to match against free-exercise-db.

export type TrackingType =
  | 'WEIGHT_REPS'
  | 'REPS_ONLY'
  | 'DURATION'
  | 'WEIGHT_DURATION'
  | 'DISTANCE_DURATION';

export type Equipment =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'CABLE'
  | 'MACHINE'
  | 'BODYWEIGHT'
  | 'BAND'
  | 'KETTLEBELL'
  | 'OTHER';

export type Movement =
  | 'PUSH'
  | 'PULL'
  | 'SQUAT'
  | 'HINGE'
  | 'CARRY'
  | 'ROTATION'
  | 'ISOLATION';

export type MuscleRole = 'PRIMARY' | 'SECONDARY';

export interface ExerciseSeed {
  name: string;
  trackingType: TrackingType;
  equipment: Equipment;
  movementPattern: Movement;
  muscles: { name: string; role: MuscleRole }[];
}

export const exercises: ExerciseSeed[] = [
  // ── Barbell Compounds ──────────────────────
  {
    name: 'Barbell Bench Press', // fe: Barbell_Bench_Press_-_Medium_Grip
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
    name: 'Incline Barbell Bench Press', // fe: Barbell_Incline_Bench_Press_-_Medium_Grip
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
    name: 'Barbell Back Squat', // fe: Barbell_Squat
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
    name: 'Barbell Front Squat', // fe: Front_Squat_Clean_Grip
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
    name: 'Conventional Deadlift', // fe: Barbell_Deadlift
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
    name: 'Barbell Overhead Press', // fe: Barbell_Shoulder_Press
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
    name: 'Barbell Bent-Over Row', // fe: Barbell_Rear_Delt_Row
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
    name: 'Dumbbell Bench Press', // fe: Dumbbell_Bench_Press
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
    name: 'Dumbbell Shoulder Press', // fe: Dumbbell_Shoulder_Press
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
    name: 'Dumbbell Bicep Curl', // fe: Dumbbell_Bicep_Curl
    trackingType: 'WEIGHT_REPS',
    equipment: 'DUMBBELL',
    movementPattern: 'ISOLATION',
    muscles: [
      { name: 'Biceps', role: 'PRIMARY' },
      { name: 'Forearms', role: 'SECONDARY' },
    ],
  },
  {
    name: 'Dumbbell Row', //Dumbbell_Incline_Row
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
    name: 'Dumbbell Lunges', //fe: Dumbbell_Lunges
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
