import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import type { Env } from '../config';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly configured: boolean;

  constructor(private readonly config: ConfigService<Env, true>) {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    const apiKey = this.config.get('CLOUDINARY_API_KEY', { infer: true });
    const apiSecret = this.config.get('CLOUDINARY_API_SECRET', { infer: true });

    this.configured = !!(cloudName && apiKey && apiSecret);

    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.logger.log('Cloudinary configured');
    } else {
      this.logger.warn(
        'Cloudinary not configured — avatar uploads will be unavailable',
      );
    }
  }

  /**
   * Upload an avatar image to Cloudinary.
   * Applies face-detect crop to 256×256 square, converts to webp.
   */
  async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    this.ensureConfigured();

    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'workout-app/avatars',
          public_id: userId,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            {
              width: 256,
              height: 256,
              crop: 'fill',
              gravity: 'face',
              format: 'webp',
              quality: 'auto',
            },
          ],
        },
        (error, result?: UploadApiResponse) => {
          if (error) {
            this.logger.error('Cloudinary upload failed', error);
            reject(new BadRequestException('Failed to upload avatar'));
          } else {
            resolve(result!.secure_url);
          }
        },
      );

      stream.end(file.buffer);
    });
  }

  /**
   * Delete an avatar from Cloudinary by userId (public_id).
   */
  async deleteAvatar(userId: string): Promise<void> {
    this.ensureConfigured();

    try {
      await cloudinary.uploader.destroy(`workout-app/avatars/${userId}`, {
        resource_type: 'image',
      });
    } catch (error) {
      this.logger.error('Cloudinary delete failed', error);
      // Don't throw — deletion failure is non-critical
    }
  }

  private ensureConfigured(): void {
    if (!this.configured) {
      throw new BadRequestException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.',
      );
    }
  }
}
