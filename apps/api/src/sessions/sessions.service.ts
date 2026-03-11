import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import type {
  StartSessionInput,
  UpdateSessionInput,
  CompleteSessionInput,
  SessionHistoryFilter,
} from '@workout/shared';
import { PrismaService } from '../prisma';
import { RecordsService } from '../records';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recordsService: RecordsService,
  ) {}

  private readonly sessionInclude = {
    sessionExercises: {
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            equipment: true,
            trackingType: true,
          },
        },
        prescribedExercise: {
          select: { restSec: true },
        },
        sets: {
          orderBy: { setNumber: 'asc' as const },
          include: {
            personalRecord: {
              select: { id: true, prType: true, value: true },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' as const },
    },
    programAssignment: {
      select: {
        id: true,
        programId: true,
        program: { select: { id: true, name: true } },
      },
    },
  };

  async start(userId: string, dto: StartSessionInput) {
    // Enforce one active session per athlete
    const existing = await this.prisma.workoutSession.findFirst({
      where: { athleteId: userId, status: 'IN_PROGRESS' },
    });

    if (existing) {
      throw new ConflictException(
        'You already have an active session. Complete or abandon it first.',
      );
    }

    if (dto.programAssignmentId) {
      return this.startFromProgram(userId, dto);
    }

    return this.prisma.workoutSession.create({
      data: {
        athleteId: userId,
        name: dto.name || 'Freestyle Workout',
        status: 'IN_PROGRESS',
      },
      include: this.sessionInclude,
    });
  }

  async findActive(userId: string) {
    return this.prisma.workoutSession.findFirst({
      where: { athleteId: userId, status: 'IN_PROGRESS' },
      include: this.sessionInclude,
    });
  }

  async findAll(userId: string, filters: SessionHistoryFilter) {
    const { page, limit, status, fromDate, toDate } = filters;

    const where: Record<string, unknown> = {
      athleteId: userId,
      status: status ? status : { not: 'IN_PROGRESS' as const },
      ...(fromDate && { startedAt: { gte: new Date(fromDate) } }),
    };

    // Merge date filters on startedAt
    if (fromDate || toDate) {
      where.startedAt = {
        ...(fromDate && { gte: new Date(fromDate) }),
        ...(toDate && { lte: new Date(`${toDate}T23:59:59.999Z`) }),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.workoutSession.findMany({
        where,
        include: this.sessionInclude,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.workoutSession.count({ where }),
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

  async findById(userId: string, id: string) {
    const session = await this.prisma.workoutSession.findUnique({
      where: { id },
      include: this.sessionInclude,
    });

    if (!session) {
      throw new NotFoundException(`Session with id "${id}" not found`);
    }

    this.assertOwnership(session, userId);
    return session;
  }

  async update(userId: string, id: string, dto: UpdateSessionInput) {
    const session = await this.findById(userId, id);
    this.assertInProgress(session);

    return this.prisma.workoutSession.update({
      where: { id },
      data: dto,
      include: this.sessionInclude,
    });
  }

  async complete(userId: string, id: string, dto: CompleteSessionInput) {
    const session = await this.findById(userId, id);
    this.assertInProgress(session);

    const completed = await this.prisma.workoutSession.update({
      where: { id },
      data: {
        ...dto,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: this.sessionInclude,
    });

    // Detect personal records synchronously
    const newPersonalRecords = await this.recordsService.detectPRs(userId, id);

    return { ...completed, newPersonalRecords };
  }

  async abandon(userId: string, id: string) {
    const session = await this.findById(userId, id);
    this.assertInProgress(session);

    return this.prisma.workoutSession.update({
      where: { id },
      data: {
        status: 'ABANDONED',
        completedAt: new Date(),
      },
      include: this.sessionInclude,
    });
  }

  // Private helpers

  private assertOwnership(
    session: { athleteId: string },
    userId: string,
  ) {
    if (session.athleteId !== userId) {
      throw new ForbiddenException(
        'You can only access your own sessions',
      );
    }
  }

  private assertInProgress(session: { status: string }) {
    if (session.status !== 'IN_PROGRESS') {
      throw new ConflictException(
        'This session is no longer in progress',
      );
    }
  }

  private async startFromProgram(userId: string, dto: StartSessionInput) {
    const assignment = await this.prisma.programAssignment.findUnique({
      where: { id: dto.programAssignmentId! },
      include: {
        program: {
          include: {
            exercises: {
              include: {
                exercise: { select: { id: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Program assignment with id "${dto.programAssignmentId}" not found`,
      );
    }

    if (assignment.athleteId !== userId) {
      throw new ForbiddenException(
        'You can only start sessions from your own program assignments',
      );
    }

    const sessionName = dto.name || assignment.program.name;

    // Atomically create session + pre-populate exercises
    const session = await this.prisma.workoutSession.create({
      data: {
        athleteId: userId,
        programAssignmentId: assignment.id,
        name: sessionName,
        status: 'IN_PROGRESS',
        sessionExercises: {
          create: assignment.program.exercises.map((pe) => ({
            exerciseId: pe.exerciseId,
            prescribedExerciseId: pe.id,
            sortOrder: pe.sortOrder,
          })),
        },
      },
      include: this.sessionInclude,
    });

    return session;
  }
}
