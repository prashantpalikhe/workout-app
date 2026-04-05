import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SessionSetsController } from './session-sets.controller';
import { SessionSetsService } from './session-sets.service';

const mockSessionSet = {
  id: 'set-1',
  sessionExerciseId: 'se-1',
  setNumber: 1,
  setType: 'WORKING',
  weight: 100,
  reps: 8,
  completed: true,
};

describe('SessionSetsController', () => {
  let controller: SessionSetsController;
  let sessionSetsService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    sessionSetsService = {
      create: vi.fn().mockResolvedValue(mockSessionSet),
      update: vi.fn().mockResolvedValue(mockSessionSet),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionSetsController],
      providers: [
        { provide: SessionSetsService, useValue: sessionSetsService },
      ],
    }).compile();

    controller = module.get<SessionSetsController>(SessionSetsController);
  });

  it('create delegates to sessionSetsService.create', async () => {
    const dto = {
      setNumber: 1,
      setType: 'WORKING' as const,
      weight: 100,
      reps: 8,
      completed: true,
    };
    const result = await controller.create('user-1', 'session-1', 'se-1', dto);
    expect(sessionSetsService.create).toHaveBeenCalledWith(
      'user-1',
      'session-1',
      'se-1',
      dto,
    );
    expect(result).toEqual(mockSessionSet);
  });

  it('update delegates to sessionSetsService.update', async () => {
    const dto = { weight: 110 };
    const result = await controller.update(
      'user-1',
      'session-1',
      'se-1',
      'set-1',
      dto,
    );
    expect(sessionSetsService.update).toHaveBeenCalledWith(
      'user-1',
      'session-1',
      'se-1',
      'set-1',
      dto,
    );
    expect(result).toEqual(mockSessionSet);
  });

  it('remove delegates to sessionSetsService.remove', async () => {
    await controller.remove('user-1', 'session-1', 'se-1', 'set-1');
    expect(sessionSetsService.remove).toHaveBeenCalledWith(
      'user-1',
      'session-1',
      'se-1',
      'set-1',
    );
  });
});
