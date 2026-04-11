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

  /**
   * Load the "me" payload used by both `GET /users/me` and the auth response.
   * Strips `passwordHash`, adds `hasPassword`, and bundles the user's settings
   * so the frontend has the unit preference (and friends) available on first paint.
   *
   * New users always get a `UserSettings` row created alongside them in `create()`,
   * and the migration that moved `unitPreference` also backfilled a row for every
   * existing user. Still, `User.userSettings` is a nullable relation at the schema
   * level, so a missing row is a possible (if pathological) runtime state — e.g.
   * a manual delete, a partial restore, or a user created by a code path that
   * bypasses `create()`. Rather than throw 404 on login/refresh/me and break the
   * whole app, we upsert on miss so the invariant "every user has settings" is
   * enforced by this read path too.
   */
  async findMeById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userSettings: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const userSettings =
      user.userSettings ??
      (await this.prisma.userSettings.create({ data: { userId: id } }));

    const { userSettings: _us, passwordHash, ...rest } = user;
    return {
      ...rest,
      hasPassword: !!passwordHash,
      settings: {
        theme: userSettings.theme,
        unitPreference: userSettings.unitPreference,
        restTimerEnabled: userSettings.restTimerEnabled,
        defaultRestSec: userSettings.defaultRestSec,
      },
    };
  }

  // ── Create ──────────────────────────────────

  async create(data: {
    email: string;
    passwordHash?: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }) {
    return this.prisma.user.create({
      data: {
        ...data,
        userSettings: { create: {} },
      },
    });
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

  // ── Delete Account ──────────────────────────
  // Cascades to all user-owned data via Prisma relations.
  async delete(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
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
    const { dateOfBirth, gender, ...rest } = dto;
    const data = {
      ...rest,
      ...(dateOfBirth !== undefined && {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      }),
      ...(gender !== undefined && {
        gender: gender ? (gender as Gender) : null,
      }),
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
    const { theme, unitPreference, ...rest } = dto;
    const data = {
      ...rest,
      ...(theme !== undefined && { theme: theme as Theme }),
      ...(unitPreference !== undefined && {
        unitPreference: unitPreference as UnitPreference,
      }),
    };

    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
