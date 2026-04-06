import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { estimate1RM } from '@workout/shared';
import type {
  CreateExerciseInput,
  UpdateExerciseInput,
  ExerciseFilter,
  ExerciseStatsFilter,
  ExerciseStatsDataPoint,
  ExerciseHistoryFilter,
  ExerciseHistorySession,
} from '@workout/shared';
import type {
  ExerciseTrackingType,
  ExerciseEquipment,
  ExerciseMovementPattern,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, filters: ExerciseFilter) {
    const { page, limit, equipment, movementPattern, muscleGroupId, search } =
      filters;

    // When searching, use pg_trgm fuzzy match via raw SQL for the ID list,
    // then hydrate with Prisma for includes. This keeps fuzzy ranking while
    // preserving the full Prisma relation loading.
    if (search) {
      return this.findAllFuzzy(userId, filters);
    }

    const where = {
      // Show global exercises + user's own custom exercises
      OR: [{ isGlobal: true }, { createdById: userId }],
      ...(equipment && {
        equipment: equipment as ExerciseEquipment,
      }),
      ...(movementPattern && {
        movementPattern: movementPattern as ExerciseMovementPattern,
      }),
      ...(muscleGroupId && {
        muscleGroups: { some: { muscleGroupId } },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.exercise.findMany({
        where,
        include: {
          muscleGroups: {
            include: { muscleGroup: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.exercise.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fuzzy search using pg_trgm similarity + ILIKE fallback.
   * Returns results ranked by similarity score (best match first).
   */
  private async findAllFuzzy(userId: string, filters: ExerciseFilter) {
    const { page, limit, search } = filters;

    const offset = (page - 1) * limit;
    const searchTerm = search!;
    const searchPattern = `%${searchTerm}%`;

    // All filter values are parameterised — inactive filters pass null and
    // the `IS NULL` check short-circuits the condition, keeping the query
    // fully safe against SQL injection.
    const equipmentFilter = filters.equipment ?? null;
    const movementFilter = filters.movementPattern ?? null;
    const muscleGroupFilter = filters.muscleGroupId ?? null;

    const [rows, countResult] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT e.id
        FROM exercises e
        WHERE (e.is_global = true OR e.created_by = ${userId})
          AND (${equipmentFilter}::text IS NULL OR e.equipment = ${equipmentFilter}::text)
          AND (${movementFilter}::text IS NULL OR e.movement_pattern = ${movementFilter}::text)
          AND (${muscleGroupFilter}::text IS NULL OR EXISTS (
            SELECT 1 FROM exercise_muscle_groups emg
            WHERE emg.exercise_id = e.id AND emg.muscle_group_id = ${muscleGroupFilter}::text
          ))
          AND (word_similarity(${searchTerm}, e.name) > 0.15 OR e.name ILIKE ${searchPattern})
        ORDER BY word_similarity(${searchTerm}, e.name) DESC, e.name ASC
        LIMIT ${limit} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM exercises e
        WHERE (e.is_global = true OR e.created_by = ${userId})
          AND (${equipmentFilter}::text IS NULL OR e.equipment = ${equipmentFilter}::text)
          AND (${movementFilter}::text IS NULL OR e.movement_pattern = ${movementFilter}::text)
          AND (${muscleGroupFilter}::text IS NULL OR EXISTS (
            SELECT 1 FROM exercise_muscle_groups emg
            WHERE emg.exercise_id = e.id AND emg.muscle_group_id = ${muscleGroupFilter}::text
          ))
          AND (word_similarity(${searchTerm}, e.name) > 0.15 OR e.name ILIKE ${searchPattern})
      `,
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const ids = rows.map((r) => r.id);

    // Hydrate with Prisma to get includes
    const exercises = ids.length
      ? await this.prisma.exercise.findMany({
          where: { id: { in: ids } },
          include: {
            muscleGroups: {
              include: { muscleGroup: true },
            },
          },
        })
      : [];

    // Preserve similarity ranking order
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
    const data = ids.map((id) => exerciseMap.get(id)!).filter(Boolean);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: {
        muscleGroups: {
          include: { muscleGroup: true },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise with id "${id}" not found`);
    }

    return exercise;
  }

  async create(userId: string, dto: CreateExerciseInput) {
    const { trackingType, equipment, movementPattern, ...rest } = dto;

    return this.prisma.exercise.create({
      data: {
        ...rest,
        trackingType: trackingType as ExerciseTrackingType,
        ...(equipment && { equipment: equipment as ExerciseEquipment }),
        ...(movementPattern && {
          movementPattern: movementPattern as ExerciseMovementPattern,
        }),
        isGlobal: false,
        createdById: userId,
      },
      include: {
        muscleGroups: {
          include: { muscleGroup: true },
        },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateExerciseInput) {
    const exercise = await this.findById(id);
    this.assertOwnership(exercise, userId);

    const { trackingType, equipment, movementPattern, ...rest } = dto;

    return this.prisma.exercise.update({
      where: { id },
      data: {
        ...rest,
        ...(trackingType !== undefined && {
          trackingType: trackingType as ExerciseTrackingType,
        }),
        ...(equipment !== undefined && {
          equipment: equipment as ExerciseEquipment,
        }),
        ...(movementPattern !== undefined && {
          movementPattern: movementPattern as ExerciseMovementPattern,
        }),
      },
      include: {
        muscleGroups: {
          include: { muscleGroup: true },
        },
      },
    });
  }

  async delete(userId: string, id: string) {
    const exercise = await this.findById(id);
    this.assertOwnership(exercise, userId);

    await this.prisma.exercise.delete({ where: { id } });
  }

  // ── Exercise Statistics (time-series for charts) ──

  async getStatistics(
    userId: string,
    exerciseId: string,
    filter: ExerciseStatsFilter,
  ): Promise<{
    exerciseId: string;
    range: string;
    dataPoints: ExerciseStatsDataPoint[];
  }> {
    const startDate = this.rangeToDate(filter.range);

    // Query per-session aggregates + individual sets for 1RM calculation
    const rows = await this.prisma.$queryRaw<
      {
        session_id: string;
        session_date: Date;
        max_weight: number | null;
        max_reps: number | null;
        total_volume: number | null;
        best_weight_for_1rm: number | null;
        best_reps_for_1rm: number | null;
      }[]
    >`
      SELECT
        ws.id AS session_id,
        DATE(ws.started_at) AS session_date,
        MAX(ss.weight)::float AS max_weight,
        MAX(ss.reps)::int AS max_reps,
        COALESCE(SUM(ss.weight * ss.reps), 0)::float AS total_volume,
        (
          SELECT sub.weight::float FROM session_sets sub
          JOIN session_exercises sub_se ON sub.session_exercise_id = sub_se.id
          WHERE sub_se.workout_session_id = ws.id
            AND sub_se.exercise_id = ${exerciseId}
            AND sub.completed = true
            AND sub.weight IS NOT NULL AND sub.weight > 0
            AND sub.reps IS NOT NULL AND sub.reps > 0
          ORDER BY (sub.weight * (1.0 + sub.reps::float / 30.0)) DESC
          LIMIT 1
        ) AS best_weight_for_1rm,
        (
          SELECT sub.reps::int FROM session_sets sub
          JOIN session_exercises sub_se ON sub.session_exercise_id = sub_se.id
          WHERE sub_se.workout_session_id = ws.id
            AND sub_se.exercise_id = ${exerciseId}
            AND sub.completed = true
            AND sub.weight IS NOT NULL AND sub.weight > 0
            AND sub.reps IS NOT NULL AND sub.reps > 0
          ORDER BY (sub.weight * (1.0 + sub.reps::float / 30.0)) DESC
          LIMIT 1
        ) AS best_reps_for_1rm
      FROM session_sets ss
      JOIN session_exercises se ON ss.session_exercise_id = se.id
      JOIN workout_sessions ws ON se.workout_session_id = ws.id
      WHERE ws.athlete_id = ${userId}
        AND se.exercise_id = ${exerciseId}
        AND ws.status = 'COMPLETED'
        AND ss.completed = true
        AND ws.started_at >= ${startDate}
      GROUP BY ws.id, session_date
      ORDER BY session_date ASC
    `;

    const dataPoints: ExerciseStatsDataPoint[] = rows.map((row) => {
      let estimated1RM: number | null = null;
      if (row.best_weight_for_1rm && row.best_reps_for_1rm) {
        estimated1RM = estimate1RM(
          row.best_weight_for_1rm,
          row.best_reps_for_1rm,
        );
      }

      return {
        date: row.session_date.toISOString().slice(0, 10),
        maxWeight: row.max_weight
          ? Math.round(row.max_weight * 100) / 100
          : null,
        estimated1RM,
        totalVolume: row.total_volume
          ? Math.round(row.total_volume * 100) / 100
          : null,
        maxReps: row.max_reps,
      };
    });

    return { exerciseId, range: filter.range, dataPoints };
  }

  // ── Exercise History (past sessions with sets) ──

  async getHistory(
    userId: string,
    exerciseId: string,
    filter: ExerciseHistoryFilter,
  ): Promise<{
    data: ExerciseHistorySession[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page, limit } = filter;

    const where = {
      exerciseId,
      workoutSession: {
        athleteId: userId,
        status: 'COMPLETED' as const,
      },
    };

    const [sessionExercises, total] = await Promise.all([
      this.prisma.sessionExercise.findMany({
        where,
        include: {
          workoutSession: { select: { id: true, name: true, startedAt: true } },
          sets: {
            orderBy: { setNumber: 'asc' as const },
            include: {
              personalRecord: {
                select: { id: true, prType: true, value: true },
              },
            },
          },
        },
        orderBy: { workoutSession: { startedAt: 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sessionExercise.count({ where }),
    ]);

    const data: ExerciseHistorySession[] = sessionExercises.map((se) => ({
      sessionId: se.workoutSession.id,
      sessionName: se.workoutSession.name,
      date: se.workoutSession.startedAt.toISOString(),
      sets: se.sets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        setType: s.setType,
        weight: s.weight,
        reps: s.reps,
        durationSec: s.durationSec,
        distance: s.distance,
        rpe: s.rpe,
        tempo: s.tempo,
        restSec: s.restSec,
        completed: s.completed,
        personalRecord: s.personalRecord,
      })),
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Private helpers ─────────────────────────────

  private rangeToDate(range: string): Date {
    const now = new Date();
    switch (range) {
      case '1y':
        return new Date(
          Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1),
        );
      case 'all':
        return new Date(0); // epoch
      default: // 12w
        return new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - 84,
          ),
        );
    }
  }

  private assertOwnership(
    exercise: { isGlobal: boolean; createdById: string | null },
    userId: string,
  ) {
    if (exercise.isGlobal || exercise.createdById !== userId) {
      throw new ForbiddenException(
        'You can only modify your own custom exercises',
      );
    }
  }
}
