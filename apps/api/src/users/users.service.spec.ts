import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    athleteProfile: { upsert: ReturnType<typeof vi.fn> };
    userSettings: { upsert: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      athleteProfile: { upsert: vi.fn() },
      userSettings: { upsert: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findByEmail', () => {
    it('should query prisma with the given email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await service.findByEmail('test@example.com');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('findById', () => {
    it('should query prisma with the given id', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await service.findById('some-uuid');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'some-uuid' },
      });
    });
  });

  describe('findByIdOrThrow', () => {
    it('should return the user if found', async () => {
      const user = { id: 'uid', email: 'a@b.com' };
      prisma.user.findUnique.mockResolvedValue(user);
      const result = await service.findByIdOrThrow('uid');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a user via prisma', async () => {
      const data = {
        email: 'new@example.com',
        passwordHash: 'hashed',
        firstName: 'John',
        lastName: 'Doe',
        role: 'ATHLETE' as const,
      };
      prisma.user.create.mockResolvedValue({ id: 'uuid', ...data });

      const result = await service.create(data);

      expect(prisma.user.create).toHaveBeenCalledWith({ data });
      expect(result.email).toBe('new@example.com');
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const updated = { id: 'uid', firstName: 'New' };
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.update('uid', { firstName: 'New' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'uid' },
        data: { firstName: 'New' },
      });
      expect(result.firstName).toBe('New');
    });
  });

  describe('getProfile', () => {
    it('should upsert with empty update (get-or-create)', async () => {
      const profile = { userId: 'uid', weight: null };
      prisma.athleteProfile.upsert.mockResolvedValue(profile);

      const result = await service.getProfile('uid');

      expect(prisma.athleteProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'uid' },
        create: { userId: 'uid' },
        update: {},
      });
      expect(result).toEqual(profile);
    });
  });

  describe('updateProfile', () => {
    it('should upsert profile with provided fields', async () => {
      const profile = { userId: 'uid', weight: 75, gender: 'MALE' };
      prisma.athleteProfile.upsert.mockResolvedValue(profile);

      const result = await service.updateProfile('uid', {
        weight: 75,
        gender: 'MALE',
      });

      expect(prisma.athleteProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'uid' },
        create: { userId: 'uid', weight: 75, gender: 'MALE' },
        update: { weight: 75, gender: 'MALE' },
      });
      expect(result.weight).toBe(75);
    });

    it('should convert dateOfBirth string to Date', async () => {
      prisma.athleteProfile.upsert.mockResolvedValue({});

      await service.updateProfile('uid', { dateOfBirth: '1990-01-15' });

      const call = prisma.athleteProfile.upsert.mock.calls[0][0];
      expect(call.create.dateOfBirth).toBeInstanceOf(Date);
      expect(call.update.dateOfBirth).toBeInstanceOf(Date);
    });
  });

  describe('getSettings', () => {
    it('should upsert with empty update (get-or-create)', async () => {
      const settings = { userId: 'uid', theme: 'SYSTEM' };
      prisma.userSettings.upsert.mockResolvedValue(settings);

      const result = await service.getSettings('uid');

      expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'uid' },
        create: { userId: 'uid' },
        update: {},
      });
      expect(result).toEqual(settings);
    });
  });

  describe('updateSettings', () => {
    it('should upsert settings with provided fields', async () => {
      const settings = { userId: 'uid', theme: 'DARK' };
      prisma.userSettings.upsert.mockResolvedValue(settings);

      const result = await service.updateSettings('uid', { theme: 'DARK' });

      expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'uid' },
        create: { userId: 'uid', theme: 'DARK' },
        update: { theme: 'DARK' },
      });
      expect(result.theme).toBe('DARK');
    });
  });
});
