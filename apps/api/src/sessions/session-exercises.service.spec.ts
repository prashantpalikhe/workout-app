import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { SessionExercisesService } from './session-exercises.service';
import { PrismaService } from '../prisma';

const mockSession = {
  id: 'session-1',
  athleteId: 'user-1',
  status: 'IN_PROGRESS',
};

const mockCompletedSession = {
  ...mockSession,
  id: 'session-2',
  status: 'COMPLETED',
};

const mockSessionExercise = {
  id: 'se-1',
  workoutSessionId: 'session-1',
  exerciseId: 'ex-1',
  sortOrder: 0,
  isSubstitution: false,
  substitutionReason: null,
  prescribedExerciseId: null,
  exercise: {
    id: 'ex-1',
    name: 'Bench Press',
    equipment: 'BARBELL',
    trackingType: 'WEIGHT_REPS',
  },
  sets: [],
};

describe('SessionExercisesService', () => {
  let service: SessionExercisesService;
  let prisma: {
    workoutSession: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    sessionExercise: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      workoutSession: {
        findUnique: vi.fn(),
      },
      sessionExercise: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        aggregate: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionExercisesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SessionExercisesService>(SessionExercisesService);
  });

  describe('add', () => {
    it('should add exercise with explicit sortOrder', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.aggregate.mockResolvedValue({
        _max: { sortOrder: 2 },
      });
      prisma.sessionExercise.create.mockResolvedValue(mockSessionExercise);

      const result = await service.add('user-1', 'session-1', {
        exerciseId: 'ex-1',
        sortOrder: 5,
      });

      expect(result).toEqual(mockSessionExercise);
      const args = prisma.sessionExercise.create.mock.calls[0][0];
      expect(args.data.sortOrder).toBe(5);
    });

    it('should auto-calculate sortOrder when not provided', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.aggregate.mockResolvedValue({
        _max: { sortOrder: 2 },
      });
      prisma.sessionExercise.create.mockResolvedValue(mockSessionExercise);

      await service.add('user-1', 'session-1', { exerciseId: 'ex-1' });

      const args = prisma.sessionExercise.create.mock.calls[0][0];
      expect(args.data.sortOrder).toBe(3);
    });

    it('should use sortOrder 0 when no exercises exist', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.aggregate.mockResolvedValue({
        _max: { sortOrder: null },
      });
      prisma.sessionExercise.create.mockResolvedValue(mockSessionExercise);

      await service.add('user-1', 'session-1', { exerciseId: 'ex-1' });

      const args = prisma.sessionExercise.create.mock.calls[0][0];
      expect(args.data.sortOrder).toBe(0);
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(null);

      await expect(
        service.add('user-1', 'missing', { exerciseId: 'ex-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for another user', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);

      await expect(
        service.add('other-user', 'session-1', { exerciseId: 'ex-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when session not in progress', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockCompletedSession);

      await expect(
        service.add('user-1', 'session-2', { exerciseId: 'ex-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a session exercise', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue(mockSessionExercise);
      prisma.sessionExercise.update.mockResolvedValue({
        ...mockSessionExercise,
        sortOrder: 3,
      });

      const result = await service.update('user-1', 'session-1', 'se-1', {
        sortOrder: 3,
      });

      expect(result.sortOrder).toBe(3);
    });

    it('should auto-mark as substitution when exerciseId changes', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue(mockSessionExercise);
      prisma.sessionExercise.update.mockResolvedValue({
        ...mockSessionExercise,
        exerciseId: 'ex-2',
        isSubstitution: true,
      });

      await service.update('user-1', 'session-1', 'se-1', {
        exerciseId: 'ex-2',
      });

      const args = prisma.sessionExercise.update.mock.calls[0][0];
      expect(args.data.isSubstitution).toBe(true);
    });

    it('should throw NotFoundException when exercise not in session', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue({
        ...mockSessionExercise,
        workoutSessionId: 'other-session',
      });

      await expect(
        service.update('user-1', 'session-1', 'se-1', { sortOrder: 3 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a session exercise', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue(mockSessionExercise);
      prisma.sessionExercise.delete.mockResolvedValue(mockSessionExercise);

      await service.remove('user-1', 'session-1', 'se-1');

      expect(prisma.sessionExercise.delete).toHaveBeenCalledWith({
        where: { id: 'se-1' },
      });
    });

    it('should throw NotFoundException when session exercise not found', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('user-1', 'session-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for another user', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);

      await expect(
        service.remove('other-user', 'session-1', 'se-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
