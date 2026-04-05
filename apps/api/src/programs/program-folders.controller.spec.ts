import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProgramFoldersController } from './program-folders.controller';
import { ProgramFoldersService } from './program-folders.service';

const mockFolder = {
  id: 'folder-1',
  userId: 'user-1',
  name: 'Push Programs',
  sortOrder: 0,
};

describe('ProgramFoldersController', () => {
  let controller: ProgramFoldersController;
  let foldersService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    foldersService = {
      findAll: vi.fn().mockResolvedValue([mockFolder]),
      create: vi.fn().mockResolvedValue(mockFolder),
      update: vi.fn().mockResolvedValue(mockFolder),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramFoldersController],
      providers: [{ provide: ProgramFoldersService, useValue: foldersService }],
    }).compile();

    controller = module.get<ProgramFoldersController>(ProgramFoldersController);
  });

  it('findAll delegates to programFoldersService.findAll', async () => {
    const result = await controller.findAll('user-1');
    expect(foldersService.findAll).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([mockFolder]);
  });

  it('create delegates to programFoldersService.create', async () => {
    const dto = { name: 'Push Programs' };
    const result = await controller.create('user-1', dto);
    expect(foldersService.create).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual(mockFolder);
  });

  it('update delegates to programFoldersService.update', async () => {
    const dto = { name: 'Updated' };
    const result = await controller.update('user-1', 'folder-1', dto);
    expect(foldersService.update).toHaveBeenCalledWith(
      'user-1',
      'folder-1',
      dto,
    );
    expect(result).toEqual(mockFolder);
  });

  it('delete delegates to programFoldersService.delete', async () => {
    await controller.delete('user-1', 'folder-1');
    expect(foldersService.delete).toHaveBeenCalledWith('user-1', 'folder-1');
  });
});
