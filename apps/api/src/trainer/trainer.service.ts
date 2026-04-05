import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma';
import type { TrainerAthleteFilter } from '@workout/shared';

@Injectable()
export class TrainerService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Invites ───────────────────────────────────

  async createInvite(trainerId: string, expiresInHours = 168) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    return this.prisma.trainerInvite.create({
      data: { trainerId, token, expiresAt },
    });
  }

  async listInvites(trainerId: string) {
    return this.prisma.trainerInvite.findMany({
      where: {
        trainerId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvite(trainerId: string, inviteId: string) {
    const invite = await this.prisma.trainerInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.trainerId !== trainerId) {
      throw new ForbiddenException('You can only revoke your own invites');
    }

    return this.prisma.trainerInvite.delete({
      where: { id: inviteId },
    });
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.trainerInvite.findUnique({
      where: { token },
      include: {
        trainer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.usedAt) {
      throw new BadRequestException('This invite has already been used');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite has expired');
    }

    return invite;
  }

  async acceptInvite(athleteId: string, token: string) {
    const invite = await this.getInviteByToken(token);

    // Prevent self-invite
    if (invite.trainerId === athleteId) {
      throw new BadRequestException('You cannot accept your own invite');
    }

    // Check for existing relationship
    const existing = await this.prisma.trainerAthlete.findUnique({
      where: {
        trainerId_athleteId: {
          trainerId: invite.trainerId,
          athleteId,
        },
      },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw new ConflictException(
          'You are already connected with this trainer',
        );
      }
      // Reactivate if was INACTIVE or DISCONNECTED
      const [relationship] = await this.prisma.$transaction([
        this.prisma.trainerAthlete.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', startedAt: new Date(), endedAt: null },
          include: {
            trainer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        }),
        this.prisma.trainerInvite.update({
          where: { id: invite.id },
          data: { usedAt: new Date(), usedById: athleteId },
        }),
      ]);
      return relationship;
    }

    // Create new relationship
    const [relationship] = await this.prisma.$transaction([
      this.prisma.trainerAthlete.create({
        data: {
          trainerId: invite.trainerId,
          athleteId,
          status: 'ACTIVE',
          startedAt: new Date(),
        },
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.trainerInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), usedById: athleteId },
      }),
    ]);

    return relationship;
  }

  // ── Trainer → Athletes ────────────────────────

  async listAthletes(trainerId: string, filters: TrainerAthleteFilter) {
    const { page, limit, status } = filters;

    const where: Record<string, unknown> = { trainerId };
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.trainerAthlete.findMany({
        where,
        include: {
          athlete: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.trainerAthlete.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateRelationship(
    trainerId: string,
    relationshipId: string,
    status: string,
  ) {
    const relationship = await this.prisma.trainerAthlete.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      throw new NotFoundException('Relationship not found');
    }

    if (relationship.trainerId !== trainerId) {
      throw new ForbiddenException(
        'You can only modify your own relationships',
      );
    }

    // Trainers can only set INACTIVE (deactivate)
    if (status !== 'INACTIVE') {
      throw new BadRequestException(
        'Trainers can only deactivate relationships',
      );
    }

    return this.prisma.trainerAthlete.update({
      where: { id: relationshipId },
      data: {
        status: 'INACTIVE',
        endedAt: new Date(),
      },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getAthleteProfile(trainerId: string, athleteId: string) {
    // Verify ACTIVE relationship
    const relationship = await this.prisma.trainerAthlete.findUnique({
      where: { trainerId_athleteId: { trainerId, athleteId } },
    });

    if (!relationship || relationship.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'You do not have an active relationship with this athlete',
      );
    }

    const [user, profile] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: athleteId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          email: true,
          createdAt: true,
        },
      }),
      this.prisma.athleteProfile.findUnique({
        where: { userId: athleteId },
      }),
    ]);

    return { ...user, profile };
  }

  // ── Athlete → Trainers ────────────────────────

  async listTrainers(athleteId: string) {
    return this.prisma.trainerAthlete.findMany({
      where: {
        athleteId,
        status: { in: ['ACTIVE', 'INACTIVE', 'PENDING'] },
      },
      include: {
        trainer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async disconnect(athleteId: string, relationshipId: string) {
    const relationship = await this.prisma.trainerAthlete.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      throw new NotFoundException('Relationship not found');
    }

    if (relationship.athleteId !== athleteId) {
      throw new ForbiddenException(
        'You can only disconnect from your own trainers',
      );
    }

    if (relationship.status === 'DISCONNECTED') {
      throw new BadRequestException(
        'This relationship is already disconnected',
      );
    }

    return this.prisma.trainerAthlete.update({
      where: { id: relationshipId },
      data: {
        status: 'DISCONNECTED',
        endedAt: new Date(),
      },
    });
  }
}
