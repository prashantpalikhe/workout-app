import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { exercises } from './data/exercises.js';

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
  console.log(`Seeding ${exercises.length} global exercises (free-exercise-db)...`);

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
          imageUrls: ex.imageUrls,
          instructions: ex.instructions,
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
          imageUrls: ex.imageUrls,
          instructions: ex.instructions,
          isGlobal: true,
        },
      });
      exerciseId = created.id;
    }

    // Sync muscle group associations
    await prisma.exerciseMuscleGroup.deleteMany({
      where: { exerciseId },
    });

    // Deduplicate muscles by (name) — some source data has duplicates
    const seenMuscles = new Set<string>();
    for (const muscle of ex.muscles) {
      if (seenMuscles.has(muscle.name)) continue;
      seenMuscles.add(muscle.name);

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
  console.log(`  ✓ ${count} global exercises seeded`);
}

// ────────────────────────────────────────────
// Main
// ────────────────────────────────────────────

async function main() {
  console.log('Starting seed...\n');

  await seedMuscleGroups();
  await seedExercises();

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
