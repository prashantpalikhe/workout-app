import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SessionExercisesController } from './session-exercises.controller';
import { SessionExercisesService } from './session-exercises.service';

const mockSessionExercise = {
  id: 'se-1',
  workoutSessionId: 'session-1',
  exerciseId: 'ex-1',
  sortOrder: 0,
  exercise: { id: 'ex-1', name: 'Bench Press' },
  sets: [],
};

describe('SessionExercisesController', () => {
  let controller: SessionExercisesController;
  let sessionExercisesService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    sessionExercisesService = {
      add: vi.fn().mockResolvedValue(mockSessionExercise),
      update: vi.fn().mockResolvedValue(mockSessionExercise),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionExercisesController],
      providers: [
        {
          provide: SessionExercisesService,
          useValue: sessionExercisesService,
        },
      ],
    }).compile();

    controller = module.get<SessionExercisesController>(
      SessionExercisesController,
    );
  });

  it('add delegates to sessionExercisesService.add', async () => {
    const dto = { exerciseId: 'ex-1' };
    const result = await controller.add('user-1', 'session-1', dto);
    expect(sessionExercisesService.add).toHaveBeenCalledWith(
      'user-1',
      'session-1',
      dto,
    );
    expect(result).toEqual(mockSessionExercise);
  });

  it('update delegates to sessionExercisesService.update', async () => {
    const dto = { sortOrder: 2 };
    const result = await controller.update('user-1', 'session-1', 'se-1', dto);
    expect(sessionExercisesService.update).toHaveBeenCalledWith(
      'user-1',
      'session-1',
      'se-1',
      dto,
    );
    expect(result).toEqual(mockSessionExercise);
  });

  it('remove delegates to sessionExercisesService.remove', async () => {
    await controller.remove('user-1', 'session-1', 'se-1');
    expect(sessionExercisesService.remove).toHaveBeenCalledWith(
      'user-1',
      'session-1',
      'se-1',
    );
  });
});
