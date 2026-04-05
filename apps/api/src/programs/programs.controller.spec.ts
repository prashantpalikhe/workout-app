import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';

const mockProgram = {
  id: 'prog-1',
  createdById: 'user-1',
  name: 'Push Pull Legs',
  exercises: [],
  folder: null,
};

const mockProgramExercise = {
  id: 'pe-1',
  programId: 'prog-1',
  exerciseId: 'ex-1',
  sortOrder: 0,
  exercise: { id: 'ex-1', name: 'Bench Press' },
};

describe('ProgramsController', () => {
  let controller: ProgramsController;
  let programsService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    programsService = {
      findAll: vi.fn().mockResolvedValue([mockProgram]),
      findById: vi.fn().mockResolvedValue(mockProgram),
      create: vi.fn().mockResolvedValue(mockProgram),
      update: vi.fn().mockResolvedValue(mockProgram),
      delete: vi.fn().mockResolvedValue(undefined),
      addExercise: vi.fn().mockResolvedValue(mockProgramExercise),
      updateExercise: vi.fn().mockResolvedValue(mockProgramExercise),
      reorderExercises: vi.fn().mockResolvedValue(mockProgram),
      removeExercise: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramsController],
      providers: [{ provide: ProgramsService, useValue: programsService }],
    }).compile();

    controller = module.get<ProgramsController>(ProgramsController);
  });

  it('findAll delegates to programsService.findAll', async () => {
    const result = await controller.findAll('user-1');
    expect(programsService.findAll).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([mockProgram]);
  });

  it('findById delegates to programsService.findById', async () => {
    const result = await controller.findById('prog-1');
    expect(programsService.findById).toHaveBeenCalledWith('prog-1');
    expect(result).toEqual(mockProgram);
  });

  it('create delegates to programsService.create', async () => {
    const dto = { name: 'Push Pull Legs' };
    const result = await controller.create('user-1', dto);
    expect(programsService.create).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual(mockProgram);
  });

  it('update delegates to programsService.update', async () => {
    const dto = { name: 'Updated' };
    const result = await controller.update('user-1', 'prog-1', dto);
    expect(programsService.update).toHaveBeenCalledWith(
      'user-1',
      'prog-1',
      dto,
    );
    expect(result).toEqual(mockProgram);
  });

  it('delete delegates to programsService.delete', async () => {
    await controller.delete('user-1', 'prog-1');
    expect(programsService.delete).toHaveBeenCalledWith('user-1', 'prog-1');
  });

  it('addExercise delegates to programsService.addExercise', async () => {
    const dto = { exerciseId: 'ex-1', sortOrder: 0 };
    const result = await controller.addExercise('user-1', 'prog-1', dto);
    expect(programsService.addExercise).toHaveBeenCalledWith(
      'user-1',
      'prog-1',
      dto,
    );
    expect(result).toEqual(mockProgramExercise);
  });

  it('reorderExercises delegates to programsService.reorderExercises', async () => {
    const items = [{ id: 'pe-1', sortOrder: 1 }];
    const result = await controller.reorderExercises('user-1', 'prog-1', items);
    expect(programsService.reorderExercises).toHaveBeenCalledWith(
      'user-1',
      'prog-1',
      items,
    );
    expect(result).toEqual(mockProgram);
  });

  it('updateExercise delegates to programsService.updateExercise', async () => {
    const dto = { targetSets: 5 };
    const result = await controller.updateExercise(
      'user-1',
      'prog-1',
      'pe-1',
      dto,
    );
    expect(programsService.updateExercise).toHaveBeenCalledWith(
      'user-1',
      'prog-1',
      'pe-1',
      dto,
    );
    expect(result).toEqual(mockProgramExercise);
  });

  it('removeExercise delegates to programsService.removeExercise', async () => {
    await controller.removeExercise('user-1', 'prog-1', 'pe-1');
    expect(programsService.removeExercise).toHaveBeenCalledWith(
      'user-1',
      'prog-1',
      'pe-1',
    );
  });
});
