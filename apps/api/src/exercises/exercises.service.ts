import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type {
  CreateExerciseInput,
  UpdateExerciseInput,
  ExerciseFilter,
} from '@workout/shared';
import type {
  ExerciseTrackingType,
  ExerciseEquipment,
  ExerciseMovementPattern,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, filters: ExerciseFilter) {
    const { page, limit, equipment, movementPattern, muscleGroupId, search } =
      filters;

    const where = {
      // Show global exercises + user's own custom exercises
      OR: [{ isGlobal: true }, { createdById: userId }],
      ...(equipment && {
        equipment: equipment as ExerciseEquipment,
      }),
      ...(movementPattern && {
        movementPattern: movementPattern as ExerciseMovementPattern,
      }),
      ...(muscleGroupId && {
        muscleGroups: { some: { muscleGroupId } },
      }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.exercise.findMany({
        where,
        include: {
          muscleGroups: {
            include: { muscleGroup: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.exercise.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: {
        muscleGroups: {
          include: { muscleGroup: true },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise with id "${id}" not found`);
    }

    return exercise;
  }

  async create(userId: string, dto: CreateExerciseInput) {
    const { trackingType, equipment, movementPattern, ...rest } = dto;

    return this.prisma.exercise.create({
      data: {
        ...rest,
        trackingType: trackingType as ExerciseTrackingType,
        ...(equipment && { equipment: equipment as ExerciseEquipment }),
        ...(movementPattern && {
          movementPattern: movementPattern as ExerciseMovementPattern,
        }),
        isGlobal: false,
        createdById: userId,
      },
      include: {
        muscleGroups: {
          include: { muscleGroup: true },
        },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateExerciseInput) {
    const exercise = await this.findById(id);
    this.assertOwnership(exercise, userId);

    const { trackingType, equipment, movementPattern, ...rest } = dto;

    return this.prisma.exercise.update({
      where: { id },
      data: {
        ...rest,
        ...(trackingType !== undefined && {
          trackingType: trackingType as ExerciseTrackingType,
        }),
        ...(equipment !== undefined && {
          equipment: equipment as ExerciseEquipment,
        }),
        ...(movementPattern !== undefined && {
          movementPattern: movementPattern as ExerciseMovementPattern,
        }),
      },
      include: {
        muscleGroups: {
          include: { muscleGroup: true },
        },
      },
    });
  }

  async delete(userId: string, id: string) {
    const exercise = await this.findById(id);
    this.assertOwnership(exercise, userId);

    await this.prisma.exercise.delete({ where: { id } });
  }

  private assertOwnership(
    exercise: { isGlobal: boolean; createdById: string | null },
    userId: string,
  ) {
    if (exercise.isGlobal || exercise.createdById !== userId) {
      throw new ForbiddenException(
        'You can only modify your own custom exercises',
      );
    }
  }
}
