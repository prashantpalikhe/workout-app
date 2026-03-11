import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UserStatsService } from './user-stats.service';
import { PrismaService } from '../prisma';

describe('UserStatsService', () => {
  let service: UserStatsService;
  let prisma: {
    workoutSession: {
      count: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    sessionExercise: { findMany: ReturnType<typeof vi.fn> };
    personalRecord: { count: ReturnType<typeof vi.fn> };
    user: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
    $queryRaw: ReturnType<typeof vi.fn>;
  };

  const userId = 'user-1';

  beforeEach(async () => {
    prisma = {
      workoutSession: { count: vi.fn(), findFirst: vi.fn() },
      sessionExercise: { findMany: vi.fn() },
      personalRecord: { count: vi.fn() },
      user: { findUniqueOrThrow: vi.fn() },
      $queryRaw: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserStatsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UserStatsService>(UserStatsService);
  });

  describe('getStats', () => {
    it('returns zero stats for a new user', async () => {
      prisma.workoutSession.count.mockResolvedValue(0);
      prisma.$queryRaw
        .mockResolvedValueOnce([{ total_volume: 0 }]) // volume
        .mockResolvedValueOnce([]); // streak dates
      prisma.sessionExercise.findMany.mockResolvedValue([]);
      prisma.personalRecord.count.mockResolvedValue(0);
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        createdAt: new Date('2025-01-01'),
      });

      const result = await service.getStats(userId);

      expect(result).toEqual({
        totalWorkouts: 0,
        totalVolume: 0,
        currentStreak: 0,
        totalExercises: 0,
        totalPersonalRecords: 0,
        memberSince: '2025-01-01T00:00:00.000Z',
      });
    });

    it('computes correct totals from existing data', async () => {
      prisma.workoutSession.count.mockResolvedValue(42);
      prisma.$queryRaw
        .mockResolvedValueOnce([{ total_volume: 12345.67 }])
        .mockResolvedValueOnce([
          { workout_date: new Date() }, // today
        ]);
      prisma.sessionExercise.findMany.mockResolvedValue([
        { exerciseId: 'e1' },
        { exerciseId: 'e2' },
        { exerciseId: 'e3' },
      ]);
      prisma.personalRecord.count.mockResolvedValue(5);
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        createdAt: new Date('2024-06-15'),
      });

      const result = await service.getStats(userId);

      expect(result.totalWorkouts).toBe(42);
      expect(result.totalVolume).toBe(12345.67);
      expect(result.currentStreak).toBe(1);
      expect(result.totalExercises).toBe(3);
      expect(result.totalPersonalRecords).toBe(5);
    });

    it('computes streak of consecutive days', async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const dates = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push({ workout_date: d });
      }

      prisma.workoutSession.count.mockResolvedValue(5);
      prisma.$queryRaw
        .mockResolvedValueOnce([{ total_volume: 0 }])
        .mockResolvedValueOnce(dates);
      prisma.sessionExercise.findMany.mockResolvedValue([]);
      prisma.personalRecord.count.mockResolvedValue(0);
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        createdAt: new Date(),
      });

      const result = await service.getStats(userId);
      expect(result.currentStreak).toBe(5);
    });

    it('streak breaks on gap', async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Gap on day before yesterday
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      prisma.workoutSession.count.mockResolvedValue(3);
      prisma.$queryRaw
        .mockResolvedValueOnce([{ total_volume: 0 }])
        .mockResolvedValueOnce([
          { workout_date: today },
          { workout_date: yesterday },
          { workout_date: threeDaysAgo }, // gap — day -2 is missing
        ]);
      prisma.sessionExercise.findMany.mockResolvedValue([]);
      prisma.personalRecord.count.mockResolvedValue(0);
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        createdAt: new Date(),
      });

      const result = await service.getStats(userId);
      expect(result.currentStreak).toBe(2); // only today + yesterday
    });

    it('streak is zero when most recent workout is older than yesterday', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setUTCHours(0, 0, 0, 0);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      prisma.workoutSession.count.mockResolvedValue(1);
      prisma.$queryRaw
        .mockResolvedValueOnce([{ total_volume: 0 }])
        .mockResolvedValueOnce([{ workout_date: threeDaysAgo }]);
      prisma.sessionExercise.findMany.mockResolvedValue([]);
      prisma.personalRecord.count.mockResolvedValue(0);
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        createdAt: new Date(),
      });

      const result = await service.getStats(userId);
      expect(result.currentStreak).toBe(0);
    });
  });

  describe('getChartStats', () => {
    it('fills missing weeks with zero for 12w range', async () => {
      // Return data for just one week in the range
      const weekDate = new Date();
      weekDate.setUTCHours(0, 0, 0, 0);
      const day = weekDate.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      weekDate.setDate(weekDate.getDate() + diff);

      prisma.$queryRaw.mockResolvedValue([
        { bucket_start: weekDate, value: 2.5 },
      ]);

      const result = await service.getChartStats(userId, {
        range: '12w',
        metric: 'duration',
      });

      // Should have multiple weeks (12 weeks of data)
      expect(result.buckets.length).toBeGreaterThanOrEqual(12);
      expect(result.metric).toBe('duration');
      expect(result.range).toBe('12w');

      // The week with data should have value 2.5 (hours)
      const bucketWithData = result.buckets.find(
        (b) => b.start === weekDate.toISOString().slice(0, 10),
      );
      expect(bucketWithData?.value).toBe(2.5);

      // Most buckets should have value 0
      const zeroBuckets = result.buckets.filter((b) => b.value === 0);
      expect(zeroBuckets.length).toBeGreaterThanOrEqual(11);

      // periodTotal should be sum of all bucket values
      expect(result.periodTotal).toBe(2.5);
    });

    it('returns monthly buckets for 1y range', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getChartStats(userId, {
        range: '1y',
        metric: 'duration',
      });

      expect(result.metric).toBe('duration');
      expect(result.range).toBe('1y');
      expect(Array.isArray(result.buckets)).toBe(true);
      // 1 year = ~12–13 months
      expect(result.buckets.length).toBeGreaterThanOrEqual(12);
      expect(result.periodTotal).toBe(0);
    });

    it('returns monthly buckets for all range from first workout', async () => {
      // Mock findFirst for "all" range — user's first workout was 6 months ago
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
      prisma.workoutSession.findFirst.mockResolvedValue({
        startedAt: sixMonthsAgo,
      });
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getChartStats(userId, {
        range: 'all',
        metric: 'reps',
      });

      expect(result.metric).toBe('reps');
      expect(result.range).toBe('all');
      expect(Array.isArray(result.buckets)).toBe(true);
      // Should have ~6-7 monthly buckets
      expect(result.buckets.length).toBeGreaterThanOrEqual(6);
    });

    it('returns reps metric data', async () => {
      const weekDate = new Date();
      weekDate.setUTCHours(0, 0, 0, 0);
      const day = weekDate.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      weekDate.setDate(weekDate.getDate() + diff);

      prisma.$queryRaw.mockResolvedValue([
        { bucket_start: weekDate, value: 150 },
      ]);

      const result = await service.getChartStats(userId, {
        range: '12w',
        metric: 'reps',
      });

      expect(result.metric).toBe('reps');
      const bucketWithData = result.buckets.find(
        (b) => b.start === weekDate.toISOString().slice(0, 10),
      );
      expect(bucketWithData?.value).toBe(150);
      expect(result.periodTotal).toBe(150);
    });
  });

  describe('getCalendarStats', () => {
    it('returns workout days for a given month', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          workout_date: new Date('2026-03-05'),
          session_count: 1,
          total_duration: 45.5,
        },
        {
          workout_date: new Date('2026-03-10'),
          session_count: 2,
          total_duration: 90.0,
        },
      ]);

      const result = await service.getCalendarStats(userId, {
        month: 3,
        year: 2026,
      });

      expect(result.month).toBe(3);
      expect(result.year).toBe(2026);
      expect(result.workoutDays).toHaveLength(2);
      expect(result.workoutDays[0]).toEqual({
        date: '2026-03-05',
        sessionCount: 1,
        totalDuration: 46,
      });
      expect(result.workoutDays[1]).toEqual({
        date: '2026-03-10',
        sessionCount: 2,
        totalDuration: 90,
      });
    });

    it('returns empty array when no workouts in month', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getCalendarStats(userId, {
        month: 1,
        year: 2026,
      });

      expect(result.workoutDays).toEqual([]);
    });
  });
});
