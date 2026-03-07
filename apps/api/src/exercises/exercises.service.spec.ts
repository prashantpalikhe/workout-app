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

    it('should apply search filter with case-insensitive contains', async () => {
      prisma.exercise.findMany.mockResolvedValue([]);
      prisma.exercise.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        page: 1,
        limit: 20,
        search: 'bench',
      });

      const where = prisma.exercise.findMany.mock.calls[0][0].where;
      expect(where.name).toEqual({ contains: 'bench', mode: 'insensitive' });
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
      expect(where.OR).toEqual([
        { isGlobal: true },
        { createdById: 'user-1' },
      ]);
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
});
