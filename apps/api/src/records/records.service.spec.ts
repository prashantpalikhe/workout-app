import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { RecordsService } from './records.service';
import { PrismaService } from '../prisma';

const userId = 'user-1';
const sessionId = 'session-1';
const exerciseId = 'ex-1';

const makeSet = (overrides: Record<string, unknown> = {}) => ({
  id: 'set-1',
  weight: 100,
  reps: 5,
  durationSec: null,
  distance: null,
  completed: true,
  sessionExercise: {
    exerciseId,
    exercise: { trackingType: 'WEIGHT_REPS' },
  },
  ...overrides,
});

describe('RecordsService', () => {
  let service: RecordsService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      sessionSet: { findMany: vi.fn() },
      workoutSession: { findUniqueOrThrow: vi.fn() },
      personalRecord: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<RecordsService>(RecordsService);
  });

  describe('detectPRs', () => {
    it('should return empty array when no completed sets', async () => {
      prisma.sessionSet.findMany.mockResolvedValue([]);

      const result = await service.detectPRs(userId, sessionId);
      expect(result).toEqual([]);
    });

    it('should create baseline PRs when no existing records', async () => {
      const set = makeSet();
      prisma.sessionSet.findMany.mockResolvedValue([set]);
      prisma.workoutSession.findUniqueOrThrow.mockResolvedValue({
        startedAt: new Date('2026-03-10'),
      });
      prisma.personalRecord.findFirst.mockResolvedValue(null); // no existing PR

      // Mock $transaction to execute the create calls
      prisma.$transaction.mockImplementation(async (calls: Promise<any>[]) => {
        return Promise.all(calls);
      });
      prisma.personalRecord.create.mockImplementation(
        async ({ data }: any) => ({
          id: 'pr-1',
          ...data,
          exercise: { name: 'Bench Press' },
        }),
      );

      const result = await service.detectPRs(userId, sessionId);

      // WEIGHT_REPS should produce 4 PR types, all baselines
      expect(result.length).toBe(4);
      expect(result.map((r: any) => r.prType)).toEqual(
        expect.arrayContaining([
          'ONE_REP_MAX',
          'MAX_WEIGHT',
          'MAX_REPS',
          'MAX_VOLUME',
        ]),
      );
      // All should be marked as baselines
      expect(result.every((r: any) => r.isBaseline === true)).toBe(true);

      // Verify isBaseline was passed to Prisma create
      const createCalls = prisma.personalRecord.create.mock.calls;
      for (const call of createCalls) {
        expect(call[0].data.isBaseline).toBe(true);
      }
    });

    it('should set isBaseline false when beating existing record', async () => {
      const set = makeSet({ weight: 120, reps: 5 });
      prisma.sessionSet.findMany.mockResolvedValue([set]);
      prisma.workoutSession.findUniqueOrThrow.mockResolvedValue({
        startedAt: new Date('2026-03-10'),
      });

      // Existing PR is lower
      prisma.personalRecord.findFirst.mockResolvedValue({ value: 80 });

      prisma.$transaction.mockImplementation(async (calls: Promise<any>[]) => {
        return Promise.all(calls);
      });
      prisma.personalRecord.create.mockImplementation(
        async ({ data }: any) => ({
          id: 'pr-1',
          ...data,
          exercise: { name: 'Bench Press' },
        }),
      );

      const result = await service.detectPRs(userId, sessionId);

      expect(result.length).toBeGreaterThan(0);
      // None should be baselines
      expect(result.every((r: any) => r.isBaseline === false)).toBe(true);

      // Verify isBaseline was passed as false to Prisma create
      const createCalls = prisma.personalRecord.create.mock.calls;
      for (const call of createCalls) {
        expect(call[0].data.isBaseline).toBe(false);
      }
    });

    it('should not create PR when value is lower than existing', async () => {
      const set = makeSet({ weight: 80, reps: 5 }); // 1RM ≈ 93.33
      prisma.sessionSet.findMany.mockResolvedValue([set]);
      prisma.workoutSession.findUniqueOrThrow.mockResolvedValue({
        startedAt: new Date('2026-03-10'),
      });

      // Existing PR is higher for all types
      prisma.personalRecord.findFirst.mockResolvedValue({ value: 200 });
      prisma.$transaction.mockResolvedValue([]);

      const result = await service.detectPRs(userId, sessionId);
      expect(result).toEqual([]);
    });

    it('should skip exercises with DURATION tracking type', async () => {
      const set = makeSet({
        weight: null,
        reps: null,
        durationSec: 60,
        sessionExercise: {
          exerciseId,
          exercise: { trackingType: 'DURATION' },
        },
      });
      prisma.sessionSet.findMany.mockResolvedValue([set]);

      const result = await service.detectPRs(userId, sessionId);
      expect(result).toEqual([]);
    });

    it('should handle REPS_ONLY tracking type', async () => {
      const set = makeSet({
        weight: null,
        reps: 15,
        sessionExercise: {
          exerciseId,
          exercise: { trackingType: 'REPS_ONLY' },
        },
      });
      prisma.sessionSet.findMany.mockResolvedValue([set]);
      prisma.workoutSession.findUniqueOrThrow.mockResolvedValue({
        startedAt: new Date('2026-03-10'),
      });
      prisma.personalRecord.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (calls: Promise<any>[]) =>
        Promise.all(calls),
      );
      prisma.personalRecord.create.mockImplementation(
        async ({ data }: any) => ({
          id: 'pr-1',
          ...data,
          exercise: { name: 'Pull-ups' },
        }),
      );

      const result = await service.detectPRs(userId, sessionId);

      // Only MAX_REPS for REPS_ONLY
      expect(result.length).toBe(1);
      expect(result[0].prType).toBe('MAX_REPS');
      expect(result[0].value).toBe(15);
    });

    it('should skip sets with null/zero weight for 1RM', async () => {
      const set = makeSet({ weight: 0, reps: 10 });
      prisma.sessionSet.findMany.mockResolvedValue([set]);
      prisma.workoutSession.findUniqueOrThrow.mockResolvedValue({
        startedAt: new Date('2026-03-10'),
      });
      // MAX_REPS should still work, but 1RM and MAX_WEIGHT should be null
      prisma.personalRecord.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (calls: Promise<any>[]) =>
        Promise.all(calls),
      );
      prisma.personalRecord.create.mockImplementation(
        async ({ data }: any) => ({
          id: 'pr-1',
          ...data,
          exercise: { name: 'Bench Press' },
        }),
      );

      const result = await service.detectPRs(userId, sessionId);

      // Only MAX_REPS (no weight-based PRs from weight=0)
      expect(result.length).toBe(1);
      expect(result[0].prType).toBe('MAX_REPS');
    });
  });

  describe('findAll', () => {
    it('should return paginated records', async () => {
      const mockRecords = [
        {
          id: 'pr-1',
          exerciseId,
          exercise: { name: 'Bench Press' },
          prType: 'ONE_REP_MAX',
          value: 120,
          achievedOn: new Date('2026-03-10'),
          sessionSetId: 'set-1',
        },
      ];
      prisma.personalRecord.findMany.mockResolvedValue(mockRecords);
      prisma.personalRecord.count.mockResolvedValue(1);

      const result = await service.findAll(userId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].exerciseName).toBe('Bench Press');
      expect(result.meta.total).toBe(1);
    });

    it('should exclude baseline records from listing', async () => {
      prisma.personalRecord.findMany.mockResolvedValue([]);
      prisma.personalRecord.count.mockResolvedValue(0);

      await service.findAll(userId, { page: 1, limit: 20 });

      // Verify isBaseline: false is in the where clause
      const findManyCall = prisma.personalRecord.findMany.mock.calls[0][0];
      expect(findManyCall.where.isBaseline).toBe(false);

      const countCall = prisma.personalRecord.count.mock.calls[0][0];
      expect(countCall.where.isBaseline).toBe(false);
    });
  });

  describe('findByExercise', () => {
    it('should return best PR per type', async () => {
      const records = [
        {
          id: 'pr-1',
          exerciseId,
          prType: 'ONE_REP_MAX',
          value: 120,
          achievedOn: new Date(),
          sessionSetId: 'set-1',
        },
        {
          id: 'pr-2',
          exerciseId,
          prType: 'ONE_REP_MAX',
          value: 110,
          achievedOn: new Date(),
          sessionSetId: null,
        },
        {
          id: 'pr-3',
          exerciseId,
          prType: 'MAX_WEIGHT',
          value: 100,
          achievedOn: new Date(),
          sessionSetId: 'set-2',
        },
      ];
      prisma.personalRecord.findMany.mockResolvedValue(records);

      const result = await service.findByExercise(userId, exerciseId);

      // Should have 2 entries (best ONE_REP_MAX and MAX_WEIGHT)
      expect(result).toHaveLength(2);
      expect(result.find((r: any) => r.prType === 'ONE_REP_MAX')?.value).toBe(
        120,
      );
      expect(result.find((r: any) => r.prType === 'MAX_WEIGHT')?.value).toBe(
        100,
      );
    });

    it('should exclude baseline records', async () => {
      prisma.personalRecord.findMany.mockResolvedValue([]);

      await service.findByExercise(userId, exerciseId);

      const findManyCall = prisma.personalRecord.findMany.mock.calls[0][0];
      expect(findManyCall.where.isBaseline).toBe(false);
    });
  });

  describe('checkPR', () => {
    beforeEach(() => {
      prisma.exercise = { findUnique: vi.fn() };
    });

    it('should return isPR false when no existing records (first-time exercise)', async () => {
      prisma.exercise.findUnique.mockResolvedValue({
        trackingType: 'WEIGHT_REPS',
      });
      prisma.personalRecord.findFirst.mockResolvedValue(null); // no history

      const result = await service.checkPR(userId, {
        exerciseId,
        weight: 100,
        reps: 5,
      });

      expect(result.isPR).toBe(false);
      expect(result.prTypes).toEqual([]);
    });

    it('should return isPR false even when second set beats first set in first-ever session', async () => {
      prisma.exercise.findUnique.mockResolvedValue({
        trackingType: 'WEIGHT_REPS',
      });
      // No saved records
      prisma.personalRecord.findFirst.mockResolvedValue(null);
      // In-session set exists (set 1 was lighter)
      prisma.sessionSet.findMany.mockResolvedValue([
        makeSet({ id: 'set-prev', weight: 80, reps: 5 }),
      ]);

      const result = await service.checkPR(userId, {
        exerciseId,
        sessionId,
        weight: 100,
        reps: 5,
      });

      expect(result.isPR).toBe(false);
      expect(result.prTypes).toEqual([]);
    });

    it('should return isPR true when beating existing record', async () => {
      prisma.exercise.findUnique.mockResolvedValue({
        trackingType: 'WEIGHT_REPS',
      });
      // Existing record at 80
      prisma.personalRecord.findFirst.mockResolvedValue({ value: 80 });
      prisma.sessionSet.findMany.mockResolvedValue([]);

      const result = await service.checkPR(userId, {
        exerciseId,
        sessionId,
        weight: 100,
        reps: 5,
      });

      expect(result.isPR).toBe(true);
      expect(result.prTypes.length).toBeGreaterThan(0);
    });
  });
});
