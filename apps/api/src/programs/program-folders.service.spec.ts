import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProgramFoldersService } from './program-folders.service';
import { PrismaService } from '../prisma';

const mockFolder = {
  id: 'folder-1',
  userId: 'user-1',
  name: 'Push Programs',
  sortOrder: 0,
  createdAt: new Date(),
};

describe('ProgramFoldersService', () => {
  let service: ProgramFoldersService;
  let prisma: {
    programFolder: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      programFolder: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramFoldersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProgramFoldersService>(ProgramFoldersService);
  });

  describe('findAll', () => {
    it('should return all folders for the user', async () => {
      prisma.programFolder.findMany.mockResolvedValue([mockFolder]);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(1);
      const args = prisma.programFolder.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ userId: 'user-1' });
    });

    it('should order by sortOrder then createdAt', async () => {
      prisma.programFolder.findMany.mockResolvedValue([]);

      await service.findAll('user-1');

      const args = prisma.programFolder.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual([
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ]);
    });
  });

  describe('findById', () => {
    it('should return the folder when found', async () => {
      prisma.programFolder.findUnique.mockResolvedValue(mockFolder);

      const result = await service.findById('folder-1');

      expect(result).toEqual(mockFolder);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.programFolder.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a folder with userId set', async () => {
      prisma.programFolder.create.mockResolvedValue(mockFolder);

      await service.create('user-1', { name: 'Push Programs' });

      const args = prisma.programFolder.create.mock.calls[0][0];
      expect(args.data.userId).toBe('user-1');
      expect(args.data.name).toBe('Push Programs');
    });
  });

  describe('update', () => {
    it('should update a folder owned by the user', async () => {
      prisma.programFolder.findUnique.mockResolvedValue(mockFolder);
      prisma.programFolder.update.mockResolvedValue({
        ...mockFolder,
        name: 'Updated',
      });

      const result = await service.update('user-1', 'folder-1', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });

    it('should throw ForbiddenException for another user', async () => {
      prisma.programFolder.findUnique.mockResolvedValue(mockFolder);

      await expect(
        service.update('other-user', 'folder-1', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.programFolder.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'missing', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a folder owned by the user', async () => {
      prisma.programFolder.findUnique.mockResolvedValue(mockFolder);
      prisma.programFolder.delete.mockResolvedValue(mockFolder);

      await service.delete('user-1', 'folder-1');

      expect(prisma.programFolder.delete).toHaveBeenCalledWith({
        where: { id: 'folder-1' },
      });
    });

    it('should throw ForbiddenException for another user', async () => {
      prisma.programFolder.findUnique.mockResolvedValue(mockFolder);

      await expect(service.delete('other-user', 'folder-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
