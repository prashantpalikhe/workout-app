import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_DIR = path.resolve(__dirname, '../../api')
const TEST_DB_URL = 'postgresql://workout:workout_dev@localhost:5432/workout_app_test'

/**
 * Playwright global setup — runs once before all tests.
 * 1. Applies Prisma migrations to the test database.
 * 2. Truncates all tables.
 * 3. Seeds a minimal set of exercises for E2E tests.
 */
export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL: TEST_DB_URL }

  // 1. Apply migrations
  execSync('pnpm exec prisma migrate deploy', {
    cwd: API_DIR,
    env,
    stdio: 'inherit'
  })

  // 2. Truncate all tables
  const pool = new pg.Pool({ connectionString: TEST_DB_URL })
  try {
    await pool.query(`
      TRUNCATE TABLE
        personal_records,
        session_sets, session_exercises, workout_sessions,
        program_assignments, program_exercises, programs, program_folders,
        measurements, trainer_invites, trainer_athletes,
        password_reset_tokens, refresh_tokens,
        user_settings, athlete_profiles, users,
        exercise_muscle_groups, exercises, muscle_groups
      CASCADE
    `)

    // 3. Seed minimal test data: a few muscle groups and exercises
    await pool.query(`
      INSERT INTO muscle_groups (id, name, body_region) VALUES
        (gen_random_uuid(), 'Chest', 'Upper Body'),
        (gen_random_uuid(), 'Quads', 'Lower Body'),
        (gen_random_uuid(), 'Lats', 'Upper Body'),
        (gen_random_uuid(), 'Triceps', 'Upper Body'),
        (gen_random_uuid(), 'Hamstrings', 'Lower Body'),
        (gen_random_uuid(), 'Glutes', 'Lower Body')
      ON CONFLICT (name) DO NOTHING
    `)

    const { rows: muscleGroups } = await pool.query(
      `SELECT id, name FROM muscle_groups`
    )
    const mgMap = new Map(muscleGroups.map((mg: { id: string, name: string }) => [mg.name, mg.id]))

    // Insert a few common exercises
    const exercises = [
      {
        name: 'Barbell Bench Press',
        equipment: 'BARBELL',
        tracking_type: 'WEIGHT_REPS',
        movement_pattern: 'PUSH',
        primary: ['Chest', 'Triceps']
      },
      {
        name: 'Barbell Squat',
        equipment: 'BARBELL',
        tracking_type: 'WEIGHT_REPS',
        movement_pattern: 'SQUAT',
        primary: ['Quads', 'Glutes']
      },
      {
        name: 'Barbell Deadlift',
        equipment: 'BARBELL',
        tracking_type: 'WEIGHT_REPS',
        movement_pattern: 'HINGE',
        primary: ['Hamstrings', 'Glutes']
      },
      {
        name: 'Lat Pulldown',
        equipment: 'CABLE',
        tracking_type: 'WEIGHT_REPS',
        movement_pattern: 'PULL',
        primary: ['Lats']
      },
      {
        name: 'Plank',
        equipment: 'BODYWEIGHT',
        tracking_type: 'DURATION',
        movement_pattern: 'ISOLATION',
        primary: []
      }
    ]

    for (const ex of exercises) {
      const { rows } = await pool.query(
        `INSERT INTO exercises (id, name, equipment, tracking_type, movement_pattern, is_global)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [ex.name, ex.equipment, ex.tracking_type, ex.movement_pattern]
      )

      if (rows[0] && ex.primary.length > 0) {
        for (const muscleName of ex.primary) {
          const mgId = mgMap.get(muscleName)
          if (mgId) {
            await pool.query(
              `INSERT INTO exercise_muscle_groups (id, exercise_id, muscle_group_id, role)
               VALUES (gen_random_uuid(), $1, $2, 'PRIMARY')
               ON CONFLICT DO NOTHING`,
              [rows[0].id, mgId]
            )
          }
        }
      }
    }

    console.log('✓ Test database reset and seeded (5 exercises)')
  } finally {
    await pool.end()
  }
}
