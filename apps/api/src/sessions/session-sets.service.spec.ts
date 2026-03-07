import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { SessionSetsService } from './session-sets.service';
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
};

const mockSessionSet = {
  id: 'set-1',
  sessionExerciseId: 'se-1',
  setNumber: 1,
  setType: 'WORKING',
  weight: 100,
  reps: 8,
  completed: true,
};

describe('SessionSetsService', () => {
  let service: SessionSetsService;
  let prisma: {
    workoutSession: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    sessionExercise: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    sessionSet: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      workoutSession: {
        findUnique: vi.fn(),
      },
      sessionExercise: {
        findUnique: vi.fn(),
      },
      sessionSet: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionSetsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SessionSetsService>(SessionSetsService);
  });

  describe('create', () => {
    it('should create a session set', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue(mockSessionExercise);
      prisma.sessionSet.create.mockResolvedValue(mockSessionSet);

      const result = await service.create('user-1', 'session-1', 'se-1', {
        setNumber: 1,
        setType: 'WORKING',
        weight: 100,
        reps: 8,
        completed: true,
      });

      expect(result).toEqual(mockSessionSet);
      const args = prisma.sessionSet.create.mock.calls[0][0];
      expect(args.data.sessionExerciseId).toBe('se-1');
      expect(args.data.setType).toBe('WORKING');
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', 'missing', 'se-1', {
          setNumber: 1,
          setType: 'WORKING',
          completed: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for another user', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);

      await expect(
        service.create('other-user', 'session-1', 'se-1', {
          setNumber: 1,
          setType: 'WORKING',
          completed: false,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when session not in progress', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockCompletedSession);

      await expect(
        service.create('user-1', 'session-2', 'se-1', {
          setNumber: 1,
          setType: 'WORKING',
          completed: false,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when exercise not in session', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue({
        ...mockSessionExercise,
        workoutSessionId: 'other-session',
      });

      await expect(
        service.create('user-1', 'session-1', 'se-1', {
          setNumber: 1,
          setType: 'WORKING',
          completed: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a session set', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue(mockSessionExercise);
      prisma.sessionSet.findUnique.mockResolvedValue(mockSessionSet);
      prisma.sessionSet.update.mockResolvedValue({
        ...mockSessionSet,
        weight: 110,
      });

      const result = await service.update(
        'user-1',
        'session-1',
        'se-1',
        'set-1',
        { weight: 110 },
      );

      expect(result.weight).toBe(110);
    });

    it('should throw NotFoundException when set not found', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue(mockSessionExercise);
      prisma.sessionSet.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'session-1', 'se-1', 'missing', {
          weight: 110,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when set belongs to different exercise', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue(mockSessionExercise);
      prisma.sessionSet.findUnique.mockResolvedValue({
        ...mockSessionSet,
        sessionExerciseId: 'other-se',
      });

      await expect(
        service.update('user-1', 'session-1', 'se-1', 'set-1', {
          weight: 110,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a session set', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue(mockSessionExercise);
      prisma.sessionSet.findUnique.mockResolvedValue(mockSessionSet);
      prisma.sessionSet.delete.mockResolvedValue(mockSessionSet);

      await service.remove('user-1', 'session-1', 'se-1', 'set-1');

      expect(prisma.sessionSet.delete).toHaveBeenCalledWith({
        where: { id: 'set-1' },
      });
    });

    it('should throw NotFoundException when set not found', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);
      prisma.sessionExercise.findUnique.mockResolvedValue(mockSessionExercise);
      prisma.sessionSet.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('user-1', 'session-1', 'se-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for another user', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(mockSession);

      await expect(
        service.remove('other-user', 'session-1', 'se-1', 'set-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
