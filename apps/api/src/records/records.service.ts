import { Injectable, Logger } from '@nestjs/common';
import {
  estimate1RM,
  PR_TYPES_BY_TRACKING_TYPE,
  PR_TYPE_PRIORITY,
  PersonalRecordType,
} from '@workout/shared';
import type { PersonalRecordFilter, CheckPRInput } from '@workout/shared';
import type { PersonalRecordType as PrismaPersonalRecordType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma';

interface SetWithExercise {
  id: string;
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
  distance: number | null;
  sessionExercise: {
    exerciseId: string;
    exercise: { trackingType: string };
  };
}

interface CandidatePR {
  exerciseId: string;
  prType: PersonalRecordType;
  value: number;
  setId: string;
  isBaseline: boolean;
}

@Injectable()
export class RecordsService {
  private readonly logger = new Logger(RecordsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Detect and store new personal records after session completion.
   * Compares completed sets against existing bests for each exercise.
   */
  async detectPRs(userId: string, sessionId: string) {
    // 1. Get all completed sets from this session with exercise info
    const sets = await this.prisma.sessionSet.findMany({
      where: {
        completed: true,
        sessionExercise: {
          workoutSessionId: sessionId,
          workoutSession: { athleteId: userId },
        },
      },
      include: {
        sessionExercise: {
          select: {
            exerciseId: true,
            exercise: { select: { trackingType: true } },
          },
        },
      },
    });

    if (sets.length === 0) return [];

    // 2. Group sets by exercise
    const setsByExercise = new Map<string, SetWithExercise[]>();
    for (const set of sets) {
      const exerciseId = set.sessionExercise.exerciseId;
      if (!setsByExercise.has(exerciseId)) {
        setsByExercise.set(exerciseId, []);
      }
      setsByExercise.get(exerciseId)!.push(set);
    }

    // 3. Compute candidates and compare against existing records
    const newPRs: CandidatePR[] = [];
    const session = await this.prisma.workoutSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: { startedAt: true },
    });

    for (const [exerciseId, exerciseSets] of setsByExercise) {
      const trackingType =
        exerciseSets[0].sessionExercise.exercise.trackingType;
      const applicablePRTypes = PR_TYPES_BY_TRACKING_TYPE[trackingType] ?? [];

      for (const prType of applicablePRTypes) {
        const candidate = this.computeCandidate(prType, exerciseSets);
        if (!candidate) continue;

        // Check existing best
        const existingBest = await this.prisma.personalRecord.findFirst({
          where: { athleteId: userId, exerciseId, prType },
          orderBy: { value: 'desc' },
          select: { value: true },
        });

        const isBaseline = !existingBest;
        if (isBaseline || candidate.value > existingBest.value) {
          newPRs.push({
            exerciseId,
            prType,
            value: candidate.value,
            setId: candidate.setId,
            isBaseline,
          });
        }
      }
    }

    if (newPRs.length === 0) return [];

    // 4. Resolve sessionSetId conflicts (unique constraint)
    // Track which setIds have been assigned
    const assignedSetIds = new Set<string>();
    const prData = newPRs
      .sort((a, b) => {
        // Sort by priority so higher-priority PR types claim the setId first
        return (
          PR_TYPE_PRIORITY.indexOf(a.prType) -
          PR_TYPE_PRIORITY.indexOf(b.prType)
        );
      })
      .map((pr) => {
        const canAssignSet = !assignedSetIds.has(pr.setId);
        if (canAssignSet) assignedSetIds.add(pr.setId);

        return {
          athleteId: userId,
          exerciseId: pr.exerciseId,
          prType: pr.prType,
          value: pr.value,
          achievedOn: session.startedAt,
          sessionSetId: canAssignSet ? pr.setId : null,
          isBaseline: pr.isBaseline,
        };
      });

    // 5. Batch insert in a transaction
    const created = await this.prisma.$transaction(
      prData.map((data) =>
        this.prisma.personalRecord.create({
          data,
          include: {
            exercise: { select: { name: true } },
          },
        }),
      ),
    );

    this.logger.log(
      `Detected ${created.length} new PR(s) for session ${sessionId}`,
    );

    return created.map((pr) => ({
      id: pr.id,
      exerciseId: pr.exerciseId,
      exerciseName: pr.exercise.name,
      prType: pr.prType,
      value: pr.value,
      achievedOn: pr.achievedOn.toISOString(),
      sessionSetId: pr.sessionSetId,
      isBaseline: pr.isBaseline,
    }));
  }

  /** List all PRs for a user (latest per exercise+type), with pagination and filtering */
  async findAll(userId: string, filter: PersonalRecordFilter) {
    const { page, limit, exerciseId, prType } = filter;

    const where = {
      athleteId: userId,
      isBaseline: false,
      ...(exerciseId && { exerciseId }),
      ...(prType && { prType: prType as PrismaPersonalRecordType }),
    };

    const [data, total] = await Promise.all([
      this.prisma.personalRecord.findMany({
        where,
        include: {
          exercise: { select: { name: true } },
        },
        orderBy: [{ achievedOn: 'desc' }, { value: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.personalRecord.count({ where }),
    ]);

    return {
      data: data.map((pr) => ({
        id: pr.id,
        exerciseId: pr.exerciseId,
        exerciseName: pr.exercise.name,
        prType: pr.prType,
        value: pr.value,
        achievedOn: pr.achievedOn.toISOString(),
        sessionSetId: pr.sessionSetId,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Get current best PRs for a specific exercise */
  async findByExercise(userId: string, exerciseId: string) {
    // Get the best (highest value) for each PR type
    const allRecords = await this.prisma.personalRecord.findMany({
      where: { athleteId: userId, exerciseId, isBaseline: false },
      orderBy: { value: 'desc' },
    });

    // Keep only the best per prType
    const bestByType = new Map<string, (typeof allRecords)[0]>();
    for (const record of allRecords) {
      if (!bestByType.has(record.prType)) {
        bestByType.set(record.prType, record);
      }
    }

    return Array.from(bestByType.values()).map((pr) => ({
      id: pr.id,
      exerciseId: pr.exerciseId,
      prType: pr.prType,
      value: pr.value,
      achievedOn: pr.achievedOn.toISOString(),
      sessionSetId: pr.sessionSetId,
    }));
  }

  /** Check if set data would be a new PR (read-only, does not store) */
  async checkPR(userId: string, input: CheckPRInput) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: input.exerciseId },
      select: { trackingType: true },
    });
    if (!exercise) return { isPR: false, prTypes: [] };

    const applicablePRTypes =
      PR_TYPES_BY_TRACKING_TYPE[exercise.trackingType] ?? [];
    if (applicablePRTypes.length === 0) return { isPR: false, prTypes: [] };

    // Build a fake set for computeCandidate
    const fakeSet: SetWithExercise = {
      id: 'check',
      weight: input.weight ?? null,
      reps: input.reps ?? null,
      durationSec: input.durationSec ?? null,
      distance: input.distance ?? null,
      sessionExercise: {
        exerciseId: input.exerciseId,
        exercise: { trackingType: exercise.trackingType },
      },
    };

    // Also fetch completed sets from the current session for this exercise,
    // so we compare against in-session bests (not just saved PR records)
    let sessionSets: SetWithExercise[] = [];
    if (input.sessionId) {
      sessionSets = await this.prisma.sessionSet.findMany({
        where: {
          completed: true,
          ...(input.excludeSetId && { id: { not: input.excludeSetId } }),
          sessionExercise: {
            workoutSessionId: input.sessionId,
            exerciseId: input.exerciseId,
            workoutSession: { athleteId: userId },
          },
        },
        include: {
          sessionExercise: {
            select: {
              exerciseId: true,
              exercise: { select: { trackingType: true } },
            },
          },
        },
      });
    }

    const prTypes: { type: string; label: string }[] = [];

    for (const prType of applicablePRTypes) {
      const candidate = this.computeCandidate(prType, [fakeSet]);
      if (!candidate) continue;

      // Check against saved PR records
      const existingBest = await this.prisma.personalRecord.findFirst({
        where: { athleteId: userId, exerciseId: input.exerciseId, prType },
        orderBy: { value: 'desc' },
        select: { value: true },
      });

      // No historical record → not a PR (first-time exercise), skip
      if (!existingBest) continue;

      // Check against in-session completed sets
      const sessionBest =
        sessionSets.length > 0
          ? this.computeCandidate(prType, sessionSets)
          : null;

      const bestValue = Math.max(existingBest.value, sessionBest?.value ?? 0);

      if (candidate.value > bestValue) {
        const label =
          prType === PersonalRecordType.ONE_REP_MAX
            ? '1RM'
            : prType === PersonalRecordType.MAX_WEIGHT
              ? 'Weight'
              : prType === PersonalRecordType.MAX_REPS
                ? 'Reps'
                : prType === PersonalRecordType.MAX_VOLUME
                  ? 'Volume'
                  : 'PR';
        prTypes.push({ type: prType, label });
      }
    }

    return { isPR: prTypes.length > 0, prTypes };
  }

  // ── Private helpers ────────────────────────────

  private computeCandidate(
    prType: PersonalRecordType,
    sets: SetWithExercise[],
  ): { value: number; setId: string } | null {
    switch (prType) {
      case PersonalRecordType.ONE_REP_MAX:
        return this.bestEstimated1RM(sets);
      case PersonalRecordType.MAX_WEIGHT:
        return this.bestByField(sets, 'weight');
      case PersonalRecordType.MAX_REPS:
        return this.bestByField(sets, 'reps');
      case PersonalRecordType.MAX_VOLUME:
        return this.bestVolume(sets);
      default:
        return null;
    }
  }

  private bestEstimated1RM(
    sets: SetWithExercise[],
  ): { value: number; setId: string } | null {
    let best: { value: number; setId: string } | null = null;

    for (const set of sets) {
      if (set.weight && set.weight > 0 && set.reps && set.reps > 0) {
        const e1rm = estimate1RM(set.weight, set.reps);
        if (!best || e1rm > best.value) {
          best = { value: e1rm, setId: set.id };
        }
      }
    }

    return best;
  }

  private bestByField(
    sets: SetWithExercise[],
    field: 'weight' | 'reps',
  ): { value: number; setId: string } | null {
    let best: { value: number; setId: string } | null = null;

    for (const set of sets) {
      const val = set[field];
      if (val && val > 0) {
        if (!best || val > best.value) {
          best = { value: val, setId: set.id };
        }
      }
    }

    return best;
  }

  private bestVolume(
    sets: SetWithExercise[],
  ): { value: number; setId: string } | null {
    let best: { value: number; setId: string } | null = null;

    for (const set of sets) {
      if (set.weight && set.weight > 0 && set.reps && set.reps > 0) {
        const volume = set.weight * set.reps;
        if (!best || volume > best.value) {
          best = { value: volume, setId: set.id };
        }
      }
    }

    return best;
  }
}
