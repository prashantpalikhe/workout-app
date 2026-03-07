import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

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

const mockPaginated = {
  data: [mockExercise],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('ExercisesController', () => {
  let controller: ExercisesController;
  let exercisesService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    exercisesService = {
      findAll: vi.fn().mockResolvedValue(mockPaginated),
      findById: vi.fn().mockResolvedValue(mockExercise),
      create: vi.fn().mockResolvedValue(mockExercise),
      update: vi.fn().mockResolvedValue(mockExercise),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExercisesController],
      providers: [{ provide: ExercisesService, useValue: exercisesService }],
    }).compile();

    controller = module.get<ExercisesController>(ExercisesController);
  });

  describe('findAll', () => {
    it('should delegate to exercisesService.findAll', async () => {
      const filters = { page: 1, limit: 20 };
      const result = await controller.findAll('user-1', filters);
      expect(exercisesService.findAll).toHaveBeenCalledWith('user-1', filters);
      expect(result).toEqual(mockPaginated);
    });
  });

  describe('findById', () => {
    it('should delegate to exercisesService.findById', async () => {
      const result = await controller.findById('ex-1');
      expect(exercisesService.findById).toHaveBeenCalledWith('ex-1');
      expect(result).toEqual(mockExercise);
    });
  });

  describe('create', () => {
    it('should delegate to exercisesService.create', async () => {
      const dto = {
        name: 'My Press',
        trackingType: 'WEIGHT_REPS' as const,
      };
      const result = await controller.create('user-1', dto);
      expect(exercisesService.create).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(mockExercise);
    });
  });

  describe('update', () => {
    it('should delegate to exercisesService.update', async () => {
      const dto = { name: 'Updated' };
      const result = await controller.update('user-1', 'ex-1', dto);
      expect(exercisesService.update).toHaveBeenCalledWith(
        'user-1',
        'ex-1',
        dto,
      );
      expect(result).toEqual(mockExercise);
    });
  });

  describe('delete', () => {
    it('should delegate to exercisesService.delete', async () => {
      await controller.delete('user-1', 'ex-1');
      expect(exercisesService.delete).toHaveBeenCalledWith('user-1', 'ex-1');
    });
  });
});
