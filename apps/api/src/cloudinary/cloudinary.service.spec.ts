import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

// Mock the cloudinary module
vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: vi.fn(),
      destroy: vi.fn(),
    },
  },
}));

import { v2 as cloudinary } from 'cloudinary';

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  describe('when configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CloudinaryService,
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn((key: string) => {
                const map: Record<string, string> = {
                  CLOUDINARY_CLOUD_NAME: 'test-cloud',
                  CLOUDINARY_API_KEY: 'test-key',
                  CLOUDINARY_API_SECRET: 'test-secret',
                };
                return map[key];
              }),
            },
          },
        ],
      }).compile();

      service = module.get<CloudinaryService>(CloudinaryService);
    });

    it('should configure cloudinary on init', () => {
      expect(cloudinary.config).toHaveBeenCalledWith({
        cloud_name: 'test-cloud',
        api_key: 'test-key',
        api_secret: 'test-secret',
      });
    });

    it('should upload avatar and return secure_url', async () => {
      const mockUrl = 'https://res.cloudinary.com/test-cloud/image/upload/v1/workout-app/avatars/uid.webp';
      const mockStream = {
        end: vi.fn(),
      };

      vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(
        (_options: unknown, callback?: (error: unknown, result?: unknown) => void) => {
          // Call callback with success
          setTimeout(() => callback?.(null, { secure_url: mockUrl }), 0);
          return mockStream as unknown as ReturnType<typeof cloudinary.uploader.upload_stream>;
        },
      );

      const mockFile = {
        buffer: Buffer.from('fake-image-data'),
        mimetype: 'image/png',
      } as Express.Multer.File;

      const result = await service.uploadAvatar(mockFile, 'uid');
      expect(result).toBe(mockUrl);
      expect(mockStream.end).toHaveBeenCalledWith(mockFile.buffer);
    });

    it('should reject on upload error', async () => {
      const mockStream = { end: vi.fn() };

      vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(
        (_options: unknown, callback?: (error: unknown, result?: unknown) => void) => {
          setTimeout(() => callback?.(new Error('Upload failed')), 0);
          return mockStream as unknown as ReturnType<typeof cloudinary.uploader.upload_stream>;
        },
      );

      const mockFile = {
        buffer: Buffer.from('fake'),
        mimetype: 'image/png',
      } as Express.Multer.File;

      await expect(service.uploadAvatar(mockFile, 'uid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete avatar by public_id', async () => {
      vi.mocked(cloudinary.uploader.destroy).mockResolvedValue(
        { result: 'ok' } as never,
      );

      await service.deleteAvatar('uid');
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'workout-app/avatars/uid',
        { resource_type: 'image' },
      );
    });
  });

  describe('when not configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CloudinaryService,
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn(() => undefined),
            },
          },
        ],
      }).compile();

      service = module.get<CloudinaryService>(CloudinaryService);
    });

    it('should throw BadRequestException on upload when not configured', async () => {
      const mockFile = {
        buffer: Buffer.from('fake'),
        mimetype: 'image/png',
      } as Express.Multer.File;

      await expect(service.uploadAvatar(mockFile, 'uid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on delete when not configured', async () => {
      await expect(service.deleteAvatar('uid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
