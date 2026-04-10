import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserStatsService } from './user-stats.service';
import { CloudinaryService } from '../cloudinary';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: Record<string, ReturnType<typeof vi.fn>>;
  let cloudinaryService: Record<string, ReturnType<typeof vi.fn>>;

  const mockUser = {
    id: 'uid',
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    avatarUrl: null,
    isTrainer: false,
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
    gender: null,
    bio: null,
    link: null,
  };

  const mockSettings = {
    id: 'sid',
    userId: 'uid',
    theme: 'SYSTEM',
    unitPreference: 'METRIC',
    restTimerEnabled: true,
    defaultRestSec: 90,
  };

  const mockMePayload = {
    id: 'uid',
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    avatarUrl: null,
    isTrainer: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    hasPassword: true,
    settings: {
      theme: 'SYSTEM',
      unitPreference: 'METRIC',
      restTimerEnabled: true,
      defaultRestSec: 90,
    },
  };

  beforeEach(async () => {
    usersService = {
      findById: vi.fn().mockResolvedValue(mockUser),
      findByIdOrThrow: vi.fn().mockResolvedValue(mockUser),
      findMeById: vi.fn().mockResolvedValue(mockMePayload),
      update: vi.fn().mockResolvedValue(mockUser),
      setAvatarUrl: vi.fn().mockResolvedValue(mockUser),
      delete: vi.fn().mockResolvedValue(undefined),
      getProfile: vi.fn().mockResolvedValue(mockProfile),
      updateProfile: vi.fn().mockResolvedValue(mockProfile),
      getSettings: vi.fn().mockResolvedValue(mockSettings),
      updateSettings: vi.fn().mockResolvedValue(mockSettings),
    };

    cloudinaryService = {
      uploadAvatar: vi
        .fn()
        .mockResolvedValue('https://res.cloudinary.com/test/avatar.webp'),
      deleteAvatar: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: CloudinaryService, useValue: cloudinaryService },
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
    it('should return the me payload via findMeById', async () => {
      const result = await controller.getMe('uid');
      expect(usersService.findMeById).toHaveBeenCalledWith('uid');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('a@b.com');
    });

    it('should bundle settings in the response', async () => {
      const result = await controller.getMe('uid');
      expect(result.settings).toEqual({
        theme: 'SYSTEM',
        unitPreference: 'METRIC',
        restTimerEnabled: true,
        defaultRestSec: 90,
      });
    });

    it('should expose hasPassword from the service payload', async () => {
      usersService.findMeById.mockResolvedValue({
        ...mockMePayload,
        hasPassword: false,
      });
      const result = await controller.getMe('uid');
      expect(result.hasPassword).toBe(false);
    });
  });

  describe('deleteMe', () => {
    it('should delete the user', async () => {
      usersService.findById.mockResolvedValue({ ...mockUser, avatarUrl: null });
      await controller.deleteMe('uid');
      expect(usersService.delete).toHaveBeenCalledWith('uid');
    });

    it('should delete cloudinary avatar if user has one', async () => {
      usersService.findById.mockResolvedValue({
        ...mockUser,
        avatarUrl: 'https://res.cloudinary.com/test/avatar.webp',
      });
      await controller.deleteMe('uid');
      expect(cloudinaryService.deleteAvatar).toHaveBeenCalledWith('uid');
      expect(usersService.delete).toHaveBeenCalledWith('uid');
    });

    it('should skip cloudinary cleanup when user has no avatar', async () => {
      usersService.findById.mockResolvedValue({ ...mockUser, avatarUrl: null });
      await controller.deleteMe('uid');
      expect(cloudinaryService.deleteAvatar).not.toHaveBeenCalled();
      expect(usersService.delete).toHaveBeenCalledWith('uid');
    });

    it('should still delete user if cloudinary cleanup fails', async () => {
      usersService.findById.mockResolvedValue({
        ...mockUser,
        avatarUrl: 'https://res.cloudinary.com/test/avatar.webp',
      });
      cloudinaryService.deleteAvatar.mockRejectedValue(new Error('boom'));
      await controller.deleteMe('uid');
      expect(usersService.delete).toHaveBeenCalledWith('uid');
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

  describe('uploadAvatar', () => {
    it('should upload avatar and update user', async () => {
      const mockFile = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/png',
        size: 1024,
      } as Express.Multer.File;

      const result = await controller.uploadAvatar('uid', mockFile);
      expect(cloudinaryService.uploadAvatar).toHaveBeenCalledWith(
        mockFile,
        'uid',
      );
      expect(usersService.setAvatarUrl).toHaveBeenCalledWith(
        'uid',
        'https://res.cloudinary.com/test/avatar.webp',
      );
      expect(result).toEqual({
        avatarUrl: 'https://res.cloudinary.com/test/avatar.webp',
      });
    });

    it('should throw if no file provided', async () => {
      await expect(
        controller.uploadAvatar(
          'uid',
          undefined as unknown as Express.Multer.File,
        ),
      ).rejects.toThrow('No file provided');
    });
  });

  describe('removeAvatar', () => {
    it('should delete from cloudinary and clear avatarUrl', async () => {
      const result = await controller.removeAvatar('uid');
      expect(cloudinaryService.deleteAvatar).toHaveBeenCalledWith('uid');
      expect(usersService.setAvatarUrl).toHaveBeenCalledWith('uid', null);
      expect(result).toEqual({ avatarUrl: null });
    });
  });
});
