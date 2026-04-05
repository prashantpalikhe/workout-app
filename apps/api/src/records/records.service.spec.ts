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

    it('should create PRs when no existing records', async () => {
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

      // WEIGHT_REPS should produce 4 PR types
      expect(result.length).toBe(4);
      expect(result.map((r: any) => r.prType)).toEqual(
        expect.arrayContaining([
          'ONE_REP_MAX',
          'MAX_WEIGHT',
          'MAX_REPS',
          'MAX_VOLUME',
        ]),
      );
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
  });
});
