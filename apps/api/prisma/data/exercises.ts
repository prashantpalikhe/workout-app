// Global exercise catalog — built from free-exercise-db (public domain)
// https://github.com/yuhonas/free-exercise-db
//
// The raw JSON lives in free-exercise-db.json (873 exercises).
// This file maps the raw data to our Prisma enums.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Types matching our Prisma enums ─────────────────

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
  instructions: string[];
  imageUrls: string[];
}

// ── Raw shape from free-exercise-db.json ────────────

interface RawExercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

// ── Mapping tables ──────────────────────────────────

const EQUIPMENT_MAP: Record<string, Equipment> = {
  barbell: 'BARBELL',
  dumbbell: 'DUMBBELL',
  cable: 'CABLE',
  machine: 'MACHINE',
  'body only': 'BODYWEIGHT',
  bands: 'BAND',
  kettlebells: 'KETTLEBELL',
  'e-z curl bar': 'BARBELL',
  'exercise ball': 'OTHER',
  'foam roll': 'OTHER',
  'medicine ball': 'OTHER',
  other: 'OTHER',
};

// free-exercise-db has 17 muscle names → our 22 muscle groups
const MUSCLE_MAP: Record<string, string> = {
  abdominals: 'Abs',
  abductors: 'Abductors',
  adductors: 'Adductors',
  biceps: 'Biceps',
  calves: 'Calves',
  chest: 'Chest',
  forearms: 'Forearms',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  lats: 'Lats',
  'lower back': 'Lower Back',
  'middle back': 'Upper Back',
  neck: 'Neck',
  quadriceps: 'Quads',
  shoulders: 'Front Delts', // broad "shoulders" → Front Delts as primary
  traps: 'Traps',
  triceps: 'Triceps',
};

// Image base URL for free-exercise-db hosted on GitHub Pages
const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// ── Derive movement pattern from force + mechanic + muscles ──

function deriveMovementPattern(raw: RawExercise): Movement {
  const muscles = raw.primaryMuscles.map((m) => m.toLowerCase());
  const name = raw.name.toLowerCase();
  const force = raw.force ?? '';
  const mechanic = raw.mechanic ?? '';

  // Squat patterns
  if (
    name.includes('squat') ||
    name.includes('leg press') ||
    name.includes('lunge') ||
    name.includes('step-up')
  ) {
    return 'SQUAT';
  }

  // Hinge patterns
  if (
    name.includes('deadlift') ||
    name.includes('hip thrust') ||
    name.includes('good morning') ||
    name.includes('hyperextension') ||
    name.includes('romanian') ||
    name.includes('kettlebell swing')
  ) {
    return 'HINGE';
  }

  // Carry patterns
  if (name.includes('carry') || name.includes("farmer's walk")) {
    return 'CARRY';
  }

  // Rotation patterns
  if (
    name.includes('twist') ||
    name.includes('rotation') ||
    name.includes('wood chop')
  ) {
    return 'ROTATION';
  }

  // Isolation
  if (mechanic === 'isolation') {
    return 'ISOLATION';
  }

  // Push/Pull from force field
  if (force === 'push') return 'PUSH';
  if (force === 'pull') return 'PULL';
  if (force === 'static') return 'ISOLATION';

  // Fallback: guess from primary muscles
  if (muscles.some((m) => ['chest', 'shoulders', 'triceps'].includes(m))) {
    return 'PUSH';
  }
  if (
    muscles.some((m) => ['lats', 'biceps', 'middle back', 'traps'].includes(m))
  ) {
    return 'PULL';
  }

  return 'PUSH'; // safe fallback
}

// ── Derive tracking type from category + equipment ──

function deriveTrackingType(raw: RawExercise): TrackingType {
  const cat = raw.category.toLowerCase();
  const name = raw.name.toLowerCase();

  if (cat === 'cardio') return 'DURATION';
  if (cat === 'stretching') return 'DURATION';

  if (
    name.includes('plank') ||
    name.includes('hold') ||
    name.includes('hang')
  ) {
    return 'DURATION';
  }

  if (raw.equipment === 'body only') return 'REPS_ONLY';

  return 'WEIGHT_REPS';
}

// ── Build exercises from JSON ───────────────────────

function loadRawExercises(): RawExercise[] {
  const filePath = join(__dirname, 'free-exercise-db.json');
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function mapExercise(raw: RawExercise): ExerciseSeed {
  const muscles: ExerciseSeed['muscles'] = [];

  for (const m of raw.primaryMuscles) {
    const mapped = MUSCLE_MAP[m.toLowerCase()];
    if (mapped) muscles.push({ name: mapped, role: 'PRIMARY' });
  }

  for (const m of raw.secondaryMuscles) {
    const mapped = MUSCLE_MAP[m.toLowerCase()];
    if (mapped) muscles.push({ name: mapped, role: 'SECONDARY' });
  }

  return {
    name: raw.name,
    trackingType: deriveTrackingType(raw),
    equipment: EQUIPMENT_MAP[raw.equipment ?? 'other'] ?? 'OTHER',
    movementPattern: deriveMovementPattern(raw),
    muscles,
    instructions: raw.instructions,
    imageUrls: raw.images.map((img) => `${IMAGE_BASE}/${img}`),
  };
}

export const exercises: ExerciseSeed[] = loadRawExercises().map(mapExercise);
