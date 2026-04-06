import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma';
import { RecordsService } from '../records';

const mockSession = {
  id: 'session-1',
  athleteId: 'user-1',
  programAssignmentId: null,
  name: 'Freestyle Workout',
  status: 'IN_PROGRESS',
  overallRpe: null,
  notes: null,
  startedAt: new Date('2026-03-07T10:00:00Z'),
  completedAt: null,
  sessionExercises: [],
  programAssignment: null,
};

const mockCompletedSession = {
  ...mockSession,
  id: 'session-2',
  status: 'COMPLETED',
  completedAt: new Date('2026-03-07T11:00:00Z'),
};

const makeSessionWithPR = (isBaseline: boolean) => ({
  ...mockSession,
  sessionExercises: [
    {
      id: 'se-1',
      exerciseId: 'ex-1',
      exercise: { id: 'ex-1', name: 'Bench Press', equipment: 'BARBELL', trackingType: 'WEIGHT_REPS', imageUrls: [] },
      prescribedExercise: null,
      sets: [
        {
          id: 'set-1',
          setNumber: 1,
          personalRecord: { id: 'pr-1', prType: 'MAX_WEIGHT', value: 100, isBaseline },
        },
      ],
    },
  ],
});

const mockAssignment = {
  id: 'assign-1',
  athleteId: 'user-1',
  programId: 'prog-1',
  program: {
    id: 'prog-1',
    name: 'Push Pull Legs',
    exercises: [
      {
        id: 'pe-1',
        exerciseId: 'ex-1',
        sortOrder: 0,
        exercise: { id: 'ex-1' },
      },
      {
        id: 'pe-2',
        exerciseId: 'ex-2',
        sortOrder: 1,
        exercise: { id: 'ex-2' },
      },
    ],
  },
};

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: {
    workoutSession: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    programAssignment: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      workoutSession: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      programAssignment: {
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: RecordsService,
          useValue: { detectPRs: vi.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  describe('start', () => {
    it('should create a freestyle session', async () => {
      prisma.workoutSession.findFirst.mockResolvedValue(null);
      prisma.workoutSession.create.mockResolvedValue(mockSession);

      const result = await service.start('user-1', {});

      expect(result).toEqual(mockSession);
      const args = prisma.workoutSession.create.mock.calls[0][0];
      expect(args.data.athleteId).toBe('user-1');
      expect(args.data.name).toBe('Freestyle Workout');
      expect(args.data.status).toBe('IN_PROGRESS');
    });

    it('should use provided name', async () => {
      prisma.workoutSession.findFirst.mockResolvedValue(null);
      prisma.workoutSession.create.mockResolvedValue(mockSession);

      await service.start('user-1', { name: 'Leg Day' });

      const args = prisma.workoutSession.create.mock.calls[0][0];
      expect(args.data.name).toBe('Leg Day');
    });

    it('should throw ConflictException when active session exists', async () => {
      prisma.workoutSession.findFirst.mockResolvedValue(mockSession);

      await expect(service.start('user-1', {})).rejects.toThrow(
        ConflictException,
      );
    });

    it('should start from program assignment', async () => {
      prisma.workoutSession.findFirst.mockResolvedValue(null);
      prisma.programAssignment.findUnique.mockResolvedValue(mockAssignment);
      prisma.workoutSession.create.mockResolvedValue({
        ...mockSession,
        programAssignmentId: 'assign-1',
        name: 'Push Pull Legs',
      });

      const result = await service.start('user-1', {
        programAssignmentId: 'assign-1',
      });

      expect(result.programAssignmentId).toBe('assign-1');
      const args = prisma.workoutSession.create.mock.calls[0][0];
      expect(args.data.programAssignmentId).toBe('assign-1');
      expect(args.data.sessionExercises.create).toHaveLength(2);
    });

    it('should throw NotFoundException for invalid program assignment', async () => {
      prisma.workoutSession.findFirst.mockResolvedValue(null);
      prisma.programAssignment.findUnique.mockResolvedValue(null);

      await expect(
        service.start('user-1', { programAssignmentId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for another user's assignment", async () => {
      prisma.workoutSession.findFirst.mockResolvedValue(null);
      prisma.programAssignment.findUnique.mockResolvedValue({
        ...mockAssignment,
        athleteId: 'other-user',
      });

      await expect(
        service.start('user-1', { programAssignmentId: 'assign-1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findActive', () => {
    it('should return the active session', async () => {
      prisma.workoutSession.findFirst.mockResolvedValue(mockSession);

      const result = await service.findActive('user-1');

      expect(result).toEqual(mockSession);
      expect(prisma.workoutSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { athleteId: 'user-1', status: 'IN_PROGRESS' },
        }),
      );
    });

    it('should return null when no active session', async () => {
      prisma.workoutSession.findFirst.mockResolvedValue(null);

      const result = await service.findActive('user-1');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated session history', async () => {
      prisma.workoutSession.findMany.mockResolvedValue([mockCompletedSession]);
      prisma.workoutSession.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should exclude IN_PROGRESS sessions by default', async () => {
      prisma.workoutSession.findMany.mockResolvedValue([]);
      prisma.workoutSession.count.mockResolvedValue(0);

      await service.findAll('user-1', { page: 1, limit: 20 });

      const args = prisma.workoutSession.findMany.mock.calls[0][0];
      expect(args.where.status).toEqual({ not: 'IN_PROGRESS' });
    });

    it('should filter by status when provided', async () => {
      prisma.workoutSession.findMany.mockResolvedValue([]);
      prisma.workoutSession.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        page: 1,
        limit: 20,
        status: 'COMPLETED',
      });

      const args = prisma.workoutSession.findMany.mock.calls[0][0];
      expect(args.where.status).toBe('COMPLETED');
    });
  });

  describe('findById', () => {
    it('should return the session when found', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);

      const result = await service.findById('user-1', 'session-1');

      expect(result).toEqual(mockSession);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(null);

      await expect(service.findById('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for another user', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);

      await expect(service.findById('other-user', 'session-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update session name', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.workoutSession.update.mockResolvedValue({
        ...mockSession,
        name: 'Updated Name',
      });

      const result = await service.update('user-1', 'session-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw ConflictException when session not in progress', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockCompletedSession);

      await expect(
        service.update('user-1', 'session-2', { name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('complete', () => {
    it('should complete a session', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.workoutSession.update.mockResolvedValue({
        ...mockSession,
        status: 'COMPLETED',
        completedAt: expect.any(Date),
      });

      const result = await service.complete('user-1', 'session-1', {
        overallRpe: 8,
      });

      const args = prisma.workoutSession.update.mock.calls[0][0];
      expect(args.data.status).toBe('COMPLETED');
      expect(args.data.completedAt).toBeInstanceOf(Date);
      expect(args.data.overallRpe).toBe(8);
    });

    it('should throw ConflictException when session already completed', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockCompletedSession);

      await expect(service.complete('user-1', 'session-2', {})).rejects.toThrow(
        ConflictException,
      );
    });

    it('should use provided completedAt when valid', async () => {
      const customTime = new Date('2026-03-07T10:30:00Z');
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.workoutSession.update.mockResolvedValue({
        ...mockSession,
        status: 'COMPLETED',
        completedAt: customTime,
      });

      await service.complete('user-1', 'session-1', {
        completedAt: customTime.toISOString(),
      });

      const args = prisma.workoutSession.update.mock.calls[0][0];
      expect(args.data.completedAt).toEqual(customTime);
    });

    it('should use current time when completedAt not provided', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.workoutSession.update.mockResolvedValue({
        ...mockSession,
        status: 'COMPLETED',
      });

      const before = new Date();
      await service.complete('user-1', 'session-1', {});
      const after = new Date();

      const args = prisma.workoutSession.update.mock.calls[0][0];
      expect(args.data.completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(args.data.completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should reject completedAt before session start', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);

      await expect(
        service.complete('user-1', 'session-1', {
          completedAt: new Date('2026-03-07T09:00:00Z').toISOString(), // before startedAt 10:00
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject completedAt in the future', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);

      const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      await expect(
        service.complete('user-1', 'session-1', {
          completedAt: future.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('abandon', () => {
    it('should abandon a session', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.workoutSession.update.mockResolvedValue({
        ...mockSession,
        status: 'ABANDONED',
        completedAt: expect.any(Date),
      });

      await service.abandon('user-1', 'session-1');

      const args = prisma.workoutSession.update.mock.calls[0][0];
      expect(args.data.status).toBe('ABANDONED');
      expect(args.data.completedAt).toBeInstanceOf(Date);
    });

    it('should throw ConflictException when session not in progress', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockCompletedSession);

      await expect(service.abandon('user-1', 'session-2')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ForbiddenException for another user', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);

      await expect(service.abandon('other-user', 'session-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('baseline PR normalization', () => {
    it('should strip baseline personalRecord from findById response', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(
        makeSessionWithPR(true),
      );

      const result = await service.findById('user-1', 'session-1');

      const set = result.sessionExercises[0].sets[0];
      expect(set.personalRecord).toBeNull();
    });

    it('should keep genuine personalRecord in findById response', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(
        makeSessionWithPR(false),
      );

      const result = await service.findById('user-1', 'session-1');

      const set = result.sessionExercises[0].sets[0];
      expect(set.personalRecord).not.toBeNull();
      expect(set.personalRecord.prType).toBe('MAX_WEIGHT');
      // isBaseline should be stripped from the response
      expect(set.personalRecord).not.toHaveProperty('isBaseline');
    });

    it('should strip baseline personalRecord from findAll response', async () => {
      prisma.workoutSession.findMany.mockResolvedValue([
        makeSessionWithPR(true),
      ]);
      prisma.workoutSession.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', { page: 1, limit: 20 });

      const set = result.data[0].sessionExercises[0].sets[0];
      expect(set.personalRecord).toBeNull();
    });

    it('should strip baseline personalRecord from start response', async () => {
      prisma.workoutSession.findFirst.mockResolvedValue(null);
      prisma.workoutSession.create.mockResolvedValue(makeSessionWithPR(true));

      const result = await service.start('user-1', {});

      const set = result.sessionExercises[0].sets[0];
      expect(set.personalRecord).toBeNull();
    });
  });
});
