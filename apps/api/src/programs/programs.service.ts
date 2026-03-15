import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type {
  CreateProgramInput,
  UpdateProgramInput,
  CreateProgramExerciseInput,
  UpdateProgramExerciseInput,
  ReorderInput,
} from '@workout/shared';
import { PrismaService } from '../prisma';

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly programInclude = {
    exercises: {
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            equipment: true,
            trackingType: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' as const },
    },
    folder: true,
    assignedBy: {
      select: { id: true, firstName: true, lastName: true },
    },
  };

  async findAll(userId: string) {
    return this.prisma.program.findMany({
      where: { createdById: userId, assignedById: null },
      include: this.programInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async findById(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: this.programInclude,
    });

    if (!program) {
      throw new NotFoundException(`Program with id "${id}" not found`);
    }

    return program;
  }

  async create(userId: string, dto: CreateProgramInput) {
    if (dto.folderId) {
      await this.validateFolderOwnership(dto.folderId, userId);
    }

    return this.prisma.program.create({
      data: {
        ...dto,
        createdById: userId,
      },
      include: this.programInclude,
    });
  }

  async update(userId: string, id: string, dto: UpdateProgramInput) {
    const program = await this.findById(id);
    this.assertOwnership(program, userId);

    if (dto.folderId) {
      await this.validateFolderOwnership(dto.folderId, userId);
    }

    return this.prisma.program.update({
      where: { id },
      data: dto,
      include: this.programInclude,
    });
  }

  async delete(userId: string, id: string) {
    const program = await this.findById(id);
    this.assertOwnership(program, userId);

    await this.prisma.program.delete({ where: { id } });
  }

  async copyProgram(
    sourceProgramId: string,
    newOwnerId: string,
    assignedById: string,
  ) {
    const source = await this.prisma.program.findUnique({
      where: { id: sourceProgramId },
      include: { exercises: true },
    });

    if (!source) {
      throw new NotFoundException(
        `Program with id "${sourceProgramId}" not found`,
      );
    }

    return this.prisma.program.create({
      data: {
        name: source.name,
        description: source.description,
        createdById: newOwnerId,
        sourceProgramId: source.id,
        assignedById,
        exercises: {
          create: source.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            sortOrder: e.sortOrder,
            targetSets: e.targetSets,
            targetReps: e.targetReps,
            targetRpe: e.targetRpe,
            targetTempo: e.targetTempo,
            restSec: e.restSec,
            notes: e.notes,
          })),
        },
      },
      include: this.programInclude,
    });
  }

  // Program Exercise methods

  async addExercise(
    userId: string,
    programId: string,
    dto: CreateProgramExerciseInput,
  ) {
    const program = await this.findById(programId);
    this.assertOwnership(program, userId);

    return this.prisma.programExercise.create({
      data: {
        ...dto,
        programId,
      },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            equipment: true,
            trackingType: true,
          },
        },
      },
    });
  }

  async updateExercise(
    userId: string,
    programId: string,
    programExerciseId: string,
    dto: UpdateProgramExerciseInput,
  ) {
    const program = await this.findById(programId);
    this.assertOwnership(program, userId);

    await this.findProgramExercise(programExerciseId, programId);

    return this.prisma.programExercise.update({
      where: { id: programExerciseId },
      data: dto,
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            equipment: true,
            trackingType: true,
          },
        },
      },
    });
  }

  async reorderExercises(
    userId: string,
    programId: string,
    items: ReorderInput,
  ) {
    const program = await this.findById(programId);
    this.assertOwnership(program, userId);

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.programExercise.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return this.findById(programId);
  }

  async removeExercise(
    userId: string,
    programId: string,
    programExerciseId: string,
  ) {
    const program = await this.findById(programId);
    this.assertOwnership(program, userId);

    await this.findProgramExercise(programExerciseId, programId);

    await this.prisma.programExercise.delete({
      where: { id: programExerciseId },
    });
  }

  // Private helpers

  private assertOwnership(
    program: { createdById: string },
    userId: string,
  ) {
    if (program.createdById !== userId) {
      throw new ForbiddenException(
        'You can only modify your own programs',
      );
    }
  }

  private async findProgramExercise(
    programExerciseId: string,
    programId: string,
  ) {
    const programExercise = await this.prisma.programExercise.findUnique({
      where: { id: programExerciseId },
    });

    if (!programExercise || programExercise.programId !== programId) {
      throw new NotFoundException(
        `Program exercise with id "${programExerciseId}" not found in program "${programId}"`,
      );
    }

    return programExercise;
  }

  private async validateFolderOwnership(folderId: string, userId: string) {
    const folder = await this.prisma.programFolder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.userId !== userId) {
      throw new NotFoundException(
        `Program folder with id "${folderId}" not found`,
      );
    }
  }
}
