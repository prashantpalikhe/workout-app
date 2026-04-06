import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { PrismaService } from '../prisma';

const mockExercise = {
  id: 'ex-1',
  name: 'Barbell Bench Press',
  trackingType: 'WEIGHT_REPS',
  equipment: 'BARBELL',
  movementPattern: 'PUSH',
  isGlobal: true,
  createdById: null,
  muscleGroups: [],
};

const mockCustomExercise = {
  ...mockExercise,
  id: 'ex-2',
  name: 'My Custom Press',
  isGlobal: false,
  createdById: 'user-1',
};

describe('ExercisesService', () => {
  let service: ExercisesService;
  let prisma: {
    exercise: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    sessionExercise: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $queryRaw: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      exercise: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      sessionExercise: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $queryRawUnsafe: vi.fn(),
      // $queryRaw is called as a tagged template literal, so the mock
      // receives (strings[], ...values) — vi.fn() handles this fine.
      $queryRaw: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ExercisesService>(ExercisesService);
  });

  describe('findAll', () => {
    it('should return paginated exercises', async () => {
      prisma.exercise.findMany.mockResolvedValue([mockExercise]);
      prisma.exercise.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply equipment filter', async () => {
      prisma.exercise.findMany.mockResolvedValue([]);
      prisma.exercise.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        page: 1,
        limit: 20,
        equipment: 'BARBELL',
      });

      const where = prisma.exercise.findMany.mock.calls[0][0].where;
      expect(where.equipment).toBe('BARBELL');
    });

    it('should use fuzzy search via $queryRaw when search term provided', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ id: 'ex-1' }]) // IDs
        .mockResolvedValueOnce([{ count: 1n }]); // count
      prisma.exercise.findMany.mockResolvedValue([mockExercise]);

      const result = await service.findAll('user-1', {
        page: 1,
        limit: 20,
        search: 'bench',
      });

      // Should use parameterised $queryRaw (tagged template) for fuzzy search
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      // Tagged template: first arg is a TemplateStringsArray containing the SQL fragments
      const templateStrings = prisma.$queryRaw.mock.calls[0][0];
      const sqlText = Array.isArray(templateStrings)
        ? templateStrings.join('')
        : String(templateStrings);
      expect(sqlText).toContain('word_similarity');
      expect(sqlText).toContain('ILIKE');
      // Should hydrate results with Prisma
      expect(prisma.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['ex-1'] } },
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return empty results for fuzzy search with no matches', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([]) // no IDs
        .mockResolvedValueOnce([{ count: 0n }]);

      const result = await service.findAll('user-1', {
        page: 1,
        limit: 20,
        search: 'xyznonexistent',
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      // Should NOT call findMany when no IDs returned
      expect(prisma.exercise.findMany).not.toHaveBeenCalled();
    });

    it('should apply muscleGroupId filter', async () => {
      prisma.exercise.findMany.mockResolvedValue([]);
      prisma.exercise.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        page: 1,
        limit: 20,
        muscleGroupId: 'mg-1',
      });

      const where = prisma.exercise.findMany.mock.calls[0][0].where;
      expect(where.muscleGroups).toEqual({ some: { muscleGroupId: 'mg-1' } });
    });

    it('should filter to global + user exercises only', async () => {
      prisma.exercise.findMany.mockResolvedValue([]);
      prisma.exercise.count.mockResolvedValue(0);

      await service.findAll('user-1', { page: 1, limit: 20 });

      const where = prisma.exercise.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([{ isGlobal: true }, { createdById: 'user-1' }]);
    });
  });

  describe('findById', () => {
    it('should return the exercise when found', async () => {
      prisma.exercise.findUnique.mockResolvedValue(mockExercise);

      const result = await service.findById('ex-1');

      expect(result).toEqual(mockExercise);
      expect(prisma.exercise.findUnique).toHaveBeenCalledWith({
        where: { id: 'ex-1' },
        include: { muscleGroups: { include: { muscleGroup: true } } },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.exercise.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a custom exercise', async () => {
      prisma.exercise.create.mockResolvedValue(mockCustomExercise);

      const result = await service.create('user-1', {
        name: 'My Custom Press',
        trackingType: 'WEIGHT_REPS',
        equipment: 'BARBELL',
        movementPattern: 'PUSH',
      });

      expect(prisma.exercise.create).toHaveBeenCalledWith({
        data: {
          name: 'My Custom Press',
          trackingType: 'WEIGHT_REPS',
          equipment: 'BARBELL',
          movementPattern: 'PUSH',
          isGlobal: false,
          createdById: 'user-1',
        },
        include: { muscleGroups: { include: { muscleGroup: true } } },
      });
      expect(result.isGlobal).toBe(false);
    });
  });

  describe('update', () => {
    it('should update a custom exercise owned by user', async () => {
      prisma.exercise.findUnique.mockResolvedValue(mockCustomExercise);
      prisma.exercise.update.mockResolvedValue({
        ...mockCustomExercise,
        name: 'Updated Press',
      });

      const result = await service.update('user-1', 'ex-2', {
        name: 'Updated Press',
      });

      expect(result.name).toBe('Updated Press');
    });

    it('should throw ForbiddenException for global exercises', async () => {
      prisma.exercise.findUnique.mockResolvedValue(mockExercise);

      await expect(
        service.update('user-1', 'ex-1', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for other user exercises', async () => {
      prisma.exercise.findUnique.mockResolvedValue(mockCustomExercise);

      await expect(
        service.update('other-user', 'ex-2', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete a custom exercise owned by user', async () => {
      prisma.exercise.findUnique.mockResolvedValue(mockCustomExercise);
      prisma.exercise.delete.mockResolvedValue(mockCustomExercise);

      await service.delete('user-1', 'ex-2');

      expect(prisma.exercise.delete).toHaveBeenCalledWith({
        where: { id: 'ex-2' },
      });
    });

    it('should throw ForbiddenException for global exercises', async () => {
      prisma.exercise.findUnique.mockResolvedValue(mockExercise);

      await expect(service.delete('user-1', 'ex-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getHistory', () => {
    it('should null out baseline personalRecord on sets', async () => {
      prisma.exercise.findUnique.mockResolvedValue(mockExercise);
      prisma.sessionExercise.findMany.mockResolvedValue([
        {
          workoutSession: {
            id: 'session-1',
            name: 'Push Day',
            startedAt: new Date('2026-03-10'),
          },
          sets: [
            {
              id: 'set-1',
              setNumber: 1,
              setType: 'WORKING',
              weight: 100,
              reps: 5,
              durationSec: null,
              distance: null,
              rpe: 8,
              tempo: null,
              restSec: 90,
              completed: true,
              personalRecord: {
                id: 'pr-1',
                prType: 'MAX_WEIGHT',
                value: 100,
                isBaseline: true,
              },
            },
          ],
        },
      ]);
      prisma.sessionExercise.count.mockResolvedValue(1);

      const result = await service.getHistory('user-1', 'ex-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data[0].sets[0].personalRecord).toBeNull();
    });

    it('should keep genuine personalRecord on sets', async () => {
      prisma.exercise.findUnique.mockResolvedValue(mockExercise);
      prisma.sessionExercise.findMany.mockResolvedValue([
        {
          workoutSession: {
            id: 'session-1',
            name: 'Push Day',
            startedAt: new Date('2026-03-10'),
          },
          sets: [
            {
              id: 'set-1',
              setNumber: 1,
              setType: 'WORKING',
              weight: 120,
              reps: 5,
              durationSec: null,
              distance: null,
              rpe: 9,
              tempo: null,
              restSec: 90,
              completed: true,
              personalRecord: {
                id: 'pr-2',
                prType: 'MAX_WEIGHT',
                value: 120,
                isBaseline: false,
              },
            },
          ],
        },
      ]);
      prisma.sessionExercise.count.mockResolvedValue(1);

      const result = await service.getHistory('user-1', 'ex-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data[0].sets[0].personalRecord).not.toBeNull();
      expect(result.data[0].sets[0].personalRecord.prType).toBe('MAX_WEIGHT');
      // isBaseline should not leak to the response
      expect(result.data[0].sets[0].personalRecord).not.toHaveProperty(
        'isBaseline',
      );
    });
  });
});
