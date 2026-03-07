import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type {
  ChartStatsFilter,
  CalendarStatsFilter,
  UserStatsResponse,
  ChartStatsResponse,
  ChartStatsBucket,
  CalendarStatsResponse,
  CalendarWorkoutDay,
} from '@workout/shared';

@Injectable()
export class UserStatsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Overview Stats ────────────────────────────

  async getStats(userId: string): Promise<UserStatsResponse> {
    const [
      totalWorkouts,
      volumeResult,
      streakDates,
      exerciseRows,
      totalPersonalRecords,
      user,
    ] = await Promise.all([
      this.prisma.workoutSession.count({
        where: { athleteId: userId, status: 'COMPLETED' },
      }),

      this.prisma.$queryRaw<[{ total_volume: number }]>`
        SELECT COALESCE(SUM(ss.weight * ss.reps), 0)::float AS total_volume
        FROM session_sets ss
        JOIN session_exercises se ON ss.session_exercise_id = se.id
        JOIN workout_sessions ws ON se.workout_session_id = ws.id
        WHERE ws.athlete_id = ${userId}
          AND ws.status = 'COMPLETED'
          AND ss.completed = true
          AND ss.weight IS NOT NULL
          AND ss.reps IS NOT NULL
      `,

      this.prisma.$queryRaw<{ workout_date: Date }[]>`
        SELECT DISTINCT DATE(ws.started_at) AS workout_date
        FROM workout_sessions ws
        WHERE ws.athlete_id = ${userId}
          AND ws.status = 'COMPLETED'
        ORDER BY workout_date DESC
      `,

      this.prisma.sessionExercise.findMany({
        where: {
          workoutSession: { athleteId: userId, status: 'COMPLETED' },
        },
        select: { exerciseId: true },
        distinct: ['exerciseId'],
      }),

      this.prisma.personalRecord.count({
        where: { athleteId: userId },
      }),

      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { createdAt: true },
      }),
    ]);

    const totalVolume = Number(volumeResult[0]?.total_volume ?? 0);
    const currentStreak = this.computeStreak(
      streakDates.map((r) => r.workout_date),
    );

    return {
      totalWorkouts,
      totalVolume: Math.round(totalVolume * 100) / 100,
      currentStreak,
      totalExercises: exerciseRows.length,
      totalPersonalRecords,
      memberSince: user.createdAt.toISOString(),
    };
  }

  // ── Chart Stats (weekly / monthly buckets) ──────

  async getChartStats(
    userId: string,
    filter: ChartStatsFilter,
  ): Promise<ChartStatsResponse> {
    // "12w" → weekly buckets; "year" / "all" → monthly buckets
    const useMonthly = filter.range !== '12w';
    const truncUnit = useMonthly ? 'month' : 'week';
    const startDate = await this.rangeToDate(filter.range, userId);

    let rows: { bucket_start: Date; value: number }[];

    if (filter.metric === 'duration') {
      rows = await this.prisma.$queryRaw`
        SELECT
          DATE_TRUNC(${truncUnit}, ws.started_at)::date AS bucket_start,
          COALESCE(SUM(EXTRACT(EPOCH FROM (ws.completed_at - ws.started_at)) / 3600), 0)::float AS value
        FROM workout_sessions ws
        WHERE ws.athlete_id = ${userId}
          AND ws.status = 'COMPLETED'
          AND ws.completed_at IS NOT NULL
          AND ws.started_at >= ${startDate}
        GROUP BY bucket_start
        ORDER BY bucket_start ASC
      `;
    } else {
      // reps
      rows = await this.prisma.$queryRaw`
        SELECT
          DATE_TRUNC(${truncUnit}, ws.started_at)::date AS bucket_start,
          COALESCE(SUM(ss.reps), 0)::float AS value
        FROM workout_sessions ws
        JOIN session_exercises se ON se.workout_session_id = ws.id
        JOIN session_sets ss ON ss.session_exercise_id = se.id
        WHERE ws.athlete_id = ${userId}
          AND ws.status = 'COMPLETED'
          AND ws.started_at >= ${startDate}
          AND ss.completed = true
          AND ss.reps IS NOT NULL
        GROUP BY bucket_start
        ORDER BY bucket_start ASC
      `;
    }

    // Build lookup from query results
    const dataMap = new Map<string, number>();
    for (const row of rows) {
      const key = row.bucket_start.toISOString().slice(0, 10);
      dataMap.set(key, Number(row.value));
    }

    // Fill all buckets in the range
    const buckets: ChartStatsBucket[] = [];

    if (useMonthly) {
      const current = this.startOfMonth(startDate);
      const end = this.startOfMonth(new Date());

      while (current <= end) {
        const start = current.toISOString().slice(0, 10);
        const endDate = new Date(current);
        endDate.setUTCMonth(endDate.getUTCMonth() + 1);
        endDate.setUTCDate(endDate.getUTCDate() - 1);

        buckets.push({
          start,
          end: endDate.toISOString().slice(0, 10),
          value: Math.round((dataMap.get(start) ?? 0) * 100) / 100,
        });

        current.setUTCMonth(current.getUTCMonth() + 1);
      }
    } else {
      // Weekly buckets
      const current = this.startOfWeek(startDate);
      const end = this.startOfWeek(new Date());

      while (current <= end) {
        const start = current.toISOString().slice(0, 10);
        const endDate = new Date(current);
        endDate.setDate(endDate.getDate() + 6);

        buckets.push({
          start,
          end: endDate.toISOString().slice(0, 10),
          value: Math.round((dataMap.get(start) ?? 0) * 100) / 100,
        });

        current.setDate(current.getDate() + 7);
      }
    }

    // Compute period total (sum of all buckets)
    const periodTotal =
      Math.round(buckets.reduce((sum, b) => sum + b.value, 0) * 100) / 100;

    return { buckets, metric: filter.metric, range: filter.range, periodTotal };
  }

  // Keep old method name as alias
  async getWeeklyStats(
    userId: string,
    filter: ChartStatsFilter,
  ): Promise<ChartStatsResponse> {
    return this.getChartStats(userId, filter);
  }

  // ── Calendar Heatmap ──────────────────────────

  async getCalendarStats(
    userId: string,
    filter: CalendarStatsFilter,
  ): Promise<CalendarStatsResponse> {
    const monthStart = new Date(
      Date.UTC(filter.year, filter.month - 1, 1),
    );
    const monthEnd = new Date(Date.UTC(filter.year, filter.month, 1));

    const rows = await this.prisma.$queryRaw<
      { workout_date: Date; session_count: number; total_duration: number }[]
    >`
      SELECT
        DATE(ws.started_at) AS workout_date,
        COUNT(*)::int AS session_count,
        COALESCE(SUM(EXTRACT(EPOCH FROM (ws.completed_at - ws.started_at)) / 60), 0)::float AS total_duration
      FROM workout_sessions ws
      WHERE ws.athlete_id = ${userId}
        AND ws.status = 'COMPLETED'
        AND ws.completed_at IS NOT NULL
        AND ws.started_at >= ${monthStart}
        AND ws.started_at < ${monthEnd}
      GROUP BY workout_date
      ORDER BY workout_date ASC
    `;

    const workoutDays: CalendarWorkoutDay[] = rows.map((r) => ({
      date: r.workout_date.toISOString().slice(0, 10),
      sessionCount: Number(r.session_count),
      totalDuration: Math.round(Number(r.total_duration)),
    }));

    return { month: filter.month, year: filter.year, workoutDays };
  }

  // ── Helpers ───────────────────────────────────

  private computeStreak(sortedDatesDesc: Date[]): number {
    if (sortedDatesDesc.length === 0) return 0;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const firstDate = new Date(sortedDatesDesc[0]);
    firstDate.setUTCHours(0, 0, 0, 0);

    // Streak must include today or yesterday
    if (firstDate < yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < sortedDatesDesc.length; i++) {
      const prev = new Date(sortedDatesDesc[i - 1]);
      const curr = new Date(sortedDatesDesc[i]);
      prev.setUTCHours(0, 0, 0, 0);
      curr.setUTCHours(0, 0, 0, 0);

      const diffDays = Math.round(
        (prev.getTime() - curr.getTime()) / 86400000,
      );
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private async rangeToDate(
    range: string,
    userId: string,
  ): Promise<Date> {
    const now = new Date();
    switch (range) {
      case 'year':
        return new Date(
          Date.UTC(
            now.getUTCFullYear() - 1,
            now.getUTCMonth(),
            1,
          ),
        );
      case 'all': {
        // Find the user's first completed workout
        const first = await this.prisma.workoutSession.findFirst({
          where: { athleteId: userId, status: 'COMPLETED' },
          orderBy: { startedAt: 'asc' },
          select: { startedAt: true },
        });
        if (!first) return now;
        return new Date(
          Date.UTC(
            first.startedAt.getUTCFullYear(),
            first.startedAt.getUTCMonth(),
            1,
          ),
        );
      }
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

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday = start of week
    d.setDate(d.getDate() + diff);
    return d;
  }

  private startOfMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
}
