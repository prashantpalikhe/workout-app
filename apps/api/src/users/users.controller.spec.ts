import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserStatsService } from './user-stats.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: Record<string, ReturnType<typeof vi.fn>>;

  const mockUser = {
    id: 'uid',
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    avatarUrl: null,
    role: 'ATHLETE',
    passwordHash: 'secret',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProfile = {
    id: 'pid',
    userId: 'uid',
    weight: 75,
    height: 180,
    dateOfBirth: null,
    unitPreference: 'METRIC',
    gender: null,
    bio: null,
    link: null,
  };

  const mockSettings = {
    id: 'sid',
    userId: 'uid',
    theme: 'SYSTEM',
    restTimerEnabled: true,
    defaultRestSec: 90,
  };

  beforeEach(async () => {
    usersService = {
      findByIdOrThrow: vi.fn().mockResolvedValue(mockUser),
      update: vi.fn().mockResolvedValue(mockUser),
      getProfile: vi.fn().mockResolvedValue(mockProfile),
      updateProfile: vi.fn().mockResolvedValue(mockProfile),
      getSettings: vi.fn().mockResolvedValue(mockSettings),
      updateSettings: vi.fn().mockResolvedValue(mockSettings),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        {
          provide: UserStatsService,
          useValue: {
            getStats: vi.fn(),
            getWeeklyStats: vi.fn(),
            getCalendarStats: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getMe', () => {
    it('should return user without passwordHash', async () => {
      const result = await controller.getMe('uid');
      expect(usersService.findByIdOrThrow).toHaveBeenCalledWith('uid');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('a@b.com');
    });
  });

  describe('updateMe', () => {
    it('should update and return user without passwordHash', async () => {
      const dto = { firstName: 'Updated' };
      const result = await controller.updateMe('uid', dto);
      expect(usersService.update).toHaveBeenCalledWith('uid', dto);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('getProfile', () => {
    it('should delegate to usersService.getProfile', async () => {
      const result = await controller.getProfile('uid');
      expect(usersService.getProfile).toHaveBeenCalledWith('uid');
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateProfile', () => {
    it('should delegate to usersService.updateProfile', async () => {
      const dto = { weight: 80 };
      const result = await controller.updateProfile('uid', dto);
      expect(usersService.updateProfile).toHaveBeenCalledWith('uid', dto);
      expect(result).toEqual(mockProfile);
    });
  });

  describe('getSettings', () => {
    it('should delegate to usersService.getSettings', async () => {
      const result = await controller.getSettings('uid');
      expect(usersService.getSettings).toHaveBeenCalledWith('uid');
      expect(result).toEqual(mockSettings);
    });
  });

  describe('updateSettings', () => {
    it('should delegate to usersService.updateSettings', async () => {
      const dto = { theme: 'DARK' as const };
      const result = await controller.updateSettings('uid', dto);
      expect(usersService.updateSettings).toHaveBeenCalledWith('uid', dto);
      expect(result).toEqual(mockSettings);
    });
  });
});
