import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import type {
  CreateSessionSetInput,
  UpdateSessionSetInput,
} from '@workout/shared';
import type { SessionSetType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma';

@Injectable()
export class SessionSetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    sessionId: string,
    sessionExerciseId: string,
    dto: CreateSessionSetInput,
  ) {
    await this.findSession(sessionId, userId);
    await this.findSessionExercise(sessionExerciseId, sessionId);

    const { setType, ...rest } = dto;

    return this.prisma.sessionSet.create({
      data: {
        ...rest,
        setType: setType as SessionSetType,
        sessionExerciseId,
      },
    });
  }

  async update(
    userId: string,
    sessionId: string,
    sessionExerciseId: string,
    setId: string,
    dto: UpdateSessionSetInput,
  ) {
    await this.findSession(sessionId, userId);
    await this.findSessionExercise(sessionExerciseId, sessionId);
    await this.findSessionSet(setId, sessionExerciseId);

    const { setType, ...rest } = dto;

    return this.prisma.sessionSet.update({
      where: { id: setId },
      data: {
        ...rest,
        ...(setType !== undefined && { setType: setType as SessionSetType }),
      },
    });
  }

  async remove(
    userId: string,
    sessionId: string,
    sessionExerciseId: string,
    setId: string,
  ) {
    await this.findSession(sessionId, userId);
    await this.findSessionExercise(sessionExerciseId, sessionId);
    await this.findSessionSet(setId, sessionExerciseId);

    await this.prisma.sessionSet.delete({
      where: { id: setId },
    });
  }

  // Private helpers

  private async findSession(sessionId: string, userId: string) {
    const session = await this.prisma.workoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(
        `Session with id "${sessionId}" not found`,
      );
    }

    if (session.athleteId !== userId) {
      throw new ForbiddenException(
        'You can only access your own sessions',
      );
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new ConflictException(
        'This session is no longer in progress',
      );
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

  private async findSessionSet(setId: string, sessionExerciseId: string) {
    const set = await this.prisma.sessionSet.findUnique({
      where: { id: setId },
    });

    if (!set || set.sessionExerciseId !== sessionExerciseId) {
      throw new NotFoundException(
        `Set with id "${setId}" not found in exercise "${sessionExerciseId}"`,
      );
    }

    return set;
  }
}
