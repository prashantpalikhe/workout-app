import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type {
  UnitPreference,
  Gender,
  Theme,
} from '../generated/prisma/client.js';
import type {
  UpdateUserInput,
  AthleteProfileInput,
  UserSettingsInput,
} from '@workout/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Find ────────────────────────────────────

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── Create ──────────────────────────────────

  async create(data: {
    email: string;
    passwordHash?: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }) {
    return this.prisma.user.create({ data });
  }

  // ── Update User ─────────────────────────────

  async update(userId: string, dto: UpdateUserInput) {
    const { isTrainer, ...rest } = dto;

    // Handle trainer toggle with relationship lifecycle
    if (isTrainer !== undefined) {
      return this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: { ...rest, isTrainer },
        });

        if (isTrainer === false) {
          // Deactivate all ACTIVE relationships where this user is trainer
          await tx.trainerAthlete.updateMany({
            where: { trainerId: userId, status: 'ACTIVE' },
            data: { status: 'INACTIVE', endedAt: new Date() },
          });
        } else if (isTrainer === true) {
          // Reactivate INACTIVE relationships (not DISCONNECTED — those are permanent)
          await tx.trainerAthlete.updateMany({
            where: { trainerId: userId, status: 'INACTIVE' },
            data: { status: 'ACTIVE', endedAt: null },
          });
        }

        return user;
      });
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: rest,
    });
  }

  // ── Avatar ────────────────────────────────────

  async setAvatarUrl(userId: string, avatarUrl: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
  }

  // ── Athlete Profile ─────────────────────────

  async getProfile(userId: string) {
    return this.prisma.athleteProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updateProfile(userId: string, dto: AthleteProfileInput) {
    const { dateOfBirth, unitPreference, gender, ...rest } = dto;
    const data = {
      ...rest,
      ...(dateOfBirth !== undefined && {
        dateOfBirth: new Date(dateOfBirth),
      }),
      ...(unitPreference !== undefined && {
        unitPreference: unitPreference as UnitPreference,
      }),
      ...(gender !== undefined && { gender: gender as Gender }),
    };

    return this.prisma.athleteProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  // ── User Settings ───────────────────────────

  async getSettings(userId: string) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updateSettings(userId: string, dto: UserSettingsInput) {
    const { theme, ...rest } = dto;
    const data = {
      ...rest,
      ...(theme !== undefined && { theme: theme as Theme }),
    };

    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
