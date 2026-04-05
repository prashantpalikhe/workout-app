import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { PrismaService } from '../prisma';

const mockProgram = {
  id: 'prog-1',
  createdById: 'user-1',
  folderId: null,
  name: 'Push Pull Legs',
  description: 'A classic PPL split',
  createdAt: new Date(),
  updatedAt: new Date(),
  exercises: [],
  folder: null,
};

const mockProgramExercise = {
  id: 'pe-1',
  programId: 'prog-1',
  exerciseId: 'ex-1',
  sortOrder: 0,
  targetSets: 3,
  targetReps: '8-12',
  targetRpe: 8,
  targetTempo: null,
  restSec: 90,
  notes: null,
  exercise: {
    id: 'ex-1',
    name: 'Bench Press',
    equipment: 'BARBELL',
    trackingType: 'WEIGHT_REPS',
  },
};

const mockFolder = {
  id: 'folder-1',
  userId: 'user-1',
  name: 'My Folder',
  sortOrder: 0,
};

describe('ProgramsService', () => {
  let service: ProgramsService;
  let prisma: {
    program: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    programExercise: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    programFolder: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      program: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      programExercise: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      programFolder: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProgramsService>(ProgramsService);
  });

  describe('findAll', () => {
    it('should return all programs for the user', async () => {
      prisma.program.findMany.mockResolvedValue([mockProgram]);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockProgram);
    });

    it('should filter by createdById', async () => {
      prisma.program.findMany.mockResolvedValue([]);

      await service.findAll('user-1');

      const args = prisma.program.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ createdById: 'user-1', assignedById: null });
    });

    it('should order by updatedAt descending', async () => {
      prisma.program.findMany.mockResolvedValue([]);

      await service.findAll('user-1');

      const args = prisma.program.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual([{ updatedAt: 'desc' }]);
    });
  });

  describe('findById', () => {
    it('should return the program when found', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);

      const result = await service.findById('prog-1');

      expect(result).toEqual(mockProgram);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.program.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a program with createdById', async () => {
      prisma.program.create.mockResolvedValue(mockProgram);

      await service.create('user-1', { name: 'Push Pull Legs' });

      const args = prisma.program.create.mock.calls[0][0];
      expect(args.data.createdById).toBe('user-1');
      expect(args.data.name).toBe('Push Pull Legs');
    });

    it('should validate folder ownership when folderId provided', async () => {
      prisma.programFolder.findUnique.mockResolvedValue(mockFolder);
      prisma.program.create.mockResolvedValue(mockProgram);

      await service.create('user-1', {
        name: 'Test',
        folderId: 'folder-1',
      });

      expect(prisma.programFolder.findUnique).toHaveBeenCalledWith({
        where: { id: 'folder-1' },
      });
    });

    it('should throw NotFoundException for invalid folderId', async () => {
      prisma.programFolder.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', { name: 'Test', folderId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for folder owned by another user', async () => {
      prisma.programFolder.findUnique.mockResolvedValue({
        ...mockFolder,
        userId: 'other-user',
      });

      await expect(
        service.create('user-1', { name: 'Test', folderId: 'folder-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a program owned by the user', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);
      prisma.program.update.mockResolvedValue({
        ...mockProgram,
        name: 'Updated',
      });

      const result = await service.update('user-1', 'prog-1', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });

    it('should throw ForbiddenException for another user', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);

      await expect(
        service.update('other-user', 'prog-1', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.program.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'missing', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a program owned by the user', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);
      prisma.program.delete.mockResolvedValue(mockProgram);

      await service.delete('user-1', 'prog-1');

      expect(prisma.program.delete).toHaveBeenCalledWith({
        where: { id: 'prog-1' },
      });
    });

    it('should throw ForbiddenException for another user', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);

      await expect(service.delete('other-user', 'prog-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addExercise', () => {
    it('should add exercise to program', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);
      prisma.programExercise.create.mockResolvedValue(mockProgramExercise);

      const result = await service.addExercise('user-1', 'prog-1', {
        exerciseId: 'ex-1',
        sortOrder: 0,
        targetSets: 3,
        targetReps: '8-12',
      });

      expect(result).toEqual(mockProgramExercise);
      const args = prisma.programExercise.create.mock.calls[0][0];
      expect(args.data.programId).toBe('prog-1');
      expect(args.data.exerciseId).toBe('ex-1');
    });

    it('should throw ForbiddenException when user does not own program', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);

      await expect(
        service.addExercise('other-user', 'prog-1', {
          exerciseId: 'ex-1',
          sortOrder: 0,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateExercise', () => {
    it('should update a program exercise', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);
      prisma.programExercise.findUnique.mockResolvedValue(mockProgramExercise);
      prisma.programExercise.update.mockResolvedValue({
        ...mockProgramExercise,
        targetSets: 5,
      });

      const result = await service.updateExercise(
        'user-1',
        'prog-1',
        'pe-1',
        { targetSets: 5 },
      );

      expect(result.targetSets).toBe(5);
    });

    it('should throw NotFoundException when program exercise not found', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);
      prisma.programExercise.findUnique.mockResolvedValue(null);

      await expect(
        service.updateExercise('user-1', 'prog-1', 'missing', {
          targetSets: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when exercise belongs to different program', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);
      prisma.programExercise.findUnique.mockResolvedValue({
        ...mockProgramExercise,
        programId: 'other-prog',
      });

      await expect(
        service.updateExercise('user-1', 'prog-1', 'pe-1', {
          targetSets: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own program', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);

      await expect(
        service.updateExercise('other-user', 'prog-1', 'pe-1', {
          targetSets: 5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reorderExercises', () => {
    it('should batch-update sortOrder in a transaction', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);
      prisma.$transaction.mockResolvedValue([]);

      const items = [
        { id: 'pe-1', sortOrder: 1 },
        { id: 'pe-2', sortOrder: 0 },
      ];

      await service.reorderExercises('user-1', 'prog-1', items);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own program', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);

      await expect(
        service.reorderExercises('other-user', 'prog-1', []),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeExercise', () => {
    it('should remove exercise from program', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);
      prisma.programExercise.findUnique.mockResolvedValue(mockProgramExercise);
      prisma.programExercise.delete.mockResolvedValue(mockProgramExercise);

      await service.removeExercise('user-1', 'prog-1', 'pe-1');

      expect(prisma.programExercise.delete).toHaveBeenCalledWith({
        where: { id: 'pe-1' },
      });
    });

    it('should throw NotFoundException when program exercise not found', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);
      prisma.programExercise.findUnique.mockResolvedValue(null);

      await expect(
        service.removeExercise('user-1', 'prog-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own program', async () => {
      prisma.program.findUnique.mockResolvedValue(mockProgram);

      await expect(
        service.removeExercise('other-user', 'prog-1', 'pe-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
