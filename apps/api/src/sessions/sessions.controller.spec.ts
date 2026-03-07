import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

const mockSession = {
  id: 'session-1',
  athleteId: 'user-1',
  name: 'Freestyle Workout',
  status: 'IN_PROGRESS',
  sessionExercises: [],
  programAssignment: null,
};

const mockPaginatedResult = {
  data: [mockSession],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('SessionsController', () => {
  let controller: SessionsController;
  let sessionsService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    sessionsService = {
      start: vi.fn().mockResolvedValue(mockSession),
      findActive: vi.fn().mockResolvedValue(mockSession),
      findAll: vi.fn().mockResolvedValue(mockPaginatedResult),
      findById: vi.fn().mockResolvedValue(mockSession),
      update: vi.fn().mockResolvedValue(mockSession),
      complete: vi.fn().mockResolvedValue({ ...mockSession, status: 'COMPLETED' }),
      abandon: vi.fn().mockResolvedValue({ ...mockSession, status: 'ABANDONED' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [{ provide: SessionsService, useValue: sessionsService }],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  it('start delegates to sessionsService.start', async () => {
    const dto = { name: 'Leg Day' };
    const result = await controller.start('user-1', dto);
    expect(sessionsService.start).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual(mockSession);
  });

  it('findActive delegates to sessionsService.findActive', async () => {
    const result = await controller.findActive('user-1');
    expect(sessionsService.findActive).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(mockSession);
  });

  it('findAll delegates to sessionsService.findAll', async () => {
    const filters = { page: 1, limit: 20 };
    const result = await controller.findAll('user-1', filters);
    expect(sessionsService.findAll).toHaveBeenCalledWith('user-1', filters);
    expect(result).toEqual(mockPaginatedResult);
  });

  it('findById delegates to sessionsService.findById', async () => {
    const result = await controller.findById('user-1', 'session-1');
    expect(sessionsService.findById).toHaveBeenCalledWith('user-1', 'session-1');
    expect(result).toEqual(mockSession);
  });

  it('update delegates to sessionsService.update', async () => {
    const dto = { name: 'Updated' };
    const result = await controller.update('user-1', 'session-1', dto);
    expect(sessionsService.update).toHaveBeenCalledWith('user-1', 'session-1', dto);
    expect(result).toEqual(mockSession);
  });

  it('complete delegates to sessionsService.complete', async () => {
    const dto = { overallRpe: 8 };
    const result = await controller.complete('user-1', 'session-1', dto);
    expect(sessionsService.complete).toHaveBeenCalledWith('user-1', 'session-1', dto);
    expect(result.status).toBe('COMPLETED');
  });

  it('abandon delegates to sessionsService.abandon', async () => {
    const result = await controller.abandon('user-1', 'session-1');
    expect(sessionsService.abandon).toHaveBeenCalledWith('user-1', 'session-1');
    expect(result.status).toBe('ABANDONED');
  });
});
