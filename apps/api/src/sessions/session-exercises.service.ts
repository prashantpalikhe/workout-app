import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import type {
  AddSessionExerciseInput,
  UpdateSessionExerciseInput,
} from '@workout/shared';
import { PrismaService } from '../prisma';

@Injectable()
export class SessionExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly exerciseInclude = {
    exercise: {
      select: {
        id: true,
        name: true,
        equipment: true,
        trackingType: true,
      },
    },
    prescribedExercise: {
      select: {
        id: true,
        programId: true,
        restSec: true,
        targetSets: true,
        targetReps: true,
        targetRpe: true,
        targetTempo: true,
        notes: true,
      },
    },
    sets: {
      orderBy: { setNumber: 'asc' as const },
      include: {
        personalRecord: {
          select: { id: true, prType: true, value: true },
        },
      },
    },
  };

  async add(userId: string, sessionId: string, dto: AddSessionExerciseInput) {
    await this.findSession(sessionId, userId);

    // Auto-calculate sortOrder if not provided
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const maxSort = await this.prisma.sessionExercise.aggregate({
        where: { workoutSessionId: sessionId },
        _max: { sortOrder: true },
      });
      sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
    }

    return this.prisma.sessionExercise.create({
      data: {
        workoutSessionId: sessionId,
        exerciseId: dto.exerciseId,
        sortOrder,
      },
      include: this.exerciseInclude,
    });
  }

  async update(
    userId: string,
    sessionId: string,
    sessionExerciseId: string,
    dto: UpdateSessionExerciseInput,
  ) {
    await this.findSession(sessionId, userId);
    await this.findSessionExercise(sessionExerciseId, sessionId);

    // If exerciseId is being changed, implicitly mark as substitution
    const data: Record<string, unknown> = { ...dto };
    if (dto.exerciseId && !dto.isSubstitution) {
      data.isSubstitution = true;
    }

    return this.prisma.sessionExercise.update({
      where: { id: sessionExerciseId },
      data,
      include: this.exerciseInclude,
    });
  }

  async remove(userId: string, sessionId: string, sessionExerciseId: string) {
    await this.findSession(sessionId, userId);
    await this.findSessionExercise(sessionExerciseId, sessionId);

    await this.prisma.sessionExercise.delete({
      where: { id: sessionExerciseId },
    });
  }

  // Private helpers

  private async findSession(sessionId: string, userId: string) {
    const session = await this.prisma.workoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with id "${sessionId}" not found`);
    }

    if (session.athleteId !== userId) {
      throw new ForbiddenException('You can only access your own sessions');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new ConflictException('This session is no longer in progress');
    }

    return session;
  }

  private async findSessionExercise(
    sessionExerciseId: string,
    sessionId: string,
  ) {
    const se = await this.prisma.sessionExercise.findUnique({
      where: { id: sessionExerciseId },
    });

    if (!se || se.workoutSessionId !== sessionId) {
      throw new NotFoundException(
        `Session exercise with id "${sessionExerciseId}" not found in session "${sessionId}"`,
      );
    }

    return se;
  }
}
