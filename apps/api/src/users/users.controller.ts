import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  updateUserInputSchema,
  athleteProfileInputSchema,
  userSettingsInputSchema,
  chartStatsFilterSchema,
  calendarStatsFilterSchema,
  type UpdateUserInput,
  type AthleteProfileInput,
  type UserSettingsInput,
  type ChartStatsFilter,
  type CalendarStatsFilter,
} from '@workout/shared';
import { UsersService } from './users.service';
import { UserStatsService } from './user-stats.service';
import { CloudinaryService } from '../cloudinary';
import { CurrentUser, ZodValidationPipe, zodToOpenApi } from '../common';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users/me')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly userStatsService: UserStatsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ── User ────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiOkResponse({ description: 'Current user data' })
  async getMe(@CurrentUser('sub') userId: string) {
    return this.usersService.findMeById(userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete current user account and all associated data',
  })
  async deleteMe(@CurrentUser('sub') userId: string) {
    // Best-effort Cloudinary cleanup — don't block deletion on it
    const user = await this.usersService.findById(userId);
    if (user?.avatarUrl) {
      try {
        await this.cloudinaryService.deleteAvatar(userId);
      } catch (err) {
        this.logger.warn(
          `Avatar cleanup failed for user ${userId}, proceeding: ${err}`,
        );
      }
    }
    await this.usersService.delete(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user info' })
  @ApiBody({ schema: zodToOpenApi(updateUserInputSchema) })
  @ApiOkResponse({ description: 'Updated user data' })
  async updateMe(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateUserInputSchema)) dto: UpdateUserInput,
  ) {
    const user = await this.usersService.update(userId, dto);
    const { passwordHash, ...rest } = user;
    return rest;
  }

  // ── Avatar ────────────────────────────────────

  @Post('avatar')
  @ApiOperation({ summary: 'Upload avatar image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ description: 'Avatar URL' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only JPEG, PNG, WebP, and GIF images are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const avatarUrl = await this.cloudinaryService.uploadAvatar(file, userId);
    await this.usersService.setAvatarUrl(userId, avatarUrl);
    return { avatarUrl };
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Remove avatar image' })
  @ApiOkResponse({ description: 'Avatar removed' })
  async removeAvatar(@CurrentUser('sub') userId: string) {
    await this.cloudinaryService.deleteAvatar(userId);
    await this.usersService.setAvatarUrl(userId, null);
    return { avatarUrl: null };
  }

  // ── Athlete Profile ─────────────────────────

  @Get('profile')
  @ApiOperation({ summary: 'Get athlete profile' })
  @ApiOkResponse({ description: 'Athlete profile data' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update athlete profile' })
  @ApiBody({ schema: zodToOpenApi(athleteProfileInputSchema) })
  @ApiOkResponse({ description: 'Updated athlete profile' })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(athleteProfileInputSchema))
    dto: AthleteProfileInput,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  // ── User Settings ───────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Get user settings' })
  @ApiOkResponse({ description: 'User settings data' })
  async getSettings(@CurrentUser('sub') userId: string) {
    return this.usersService.getSettings(userId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update user settings' })
  @ApiBody({ schema: zodToOpenApi(userSettingsInputSchema) })
  @ApiOkResponse({ description: 'Updated user settings' })
  async updateSettings(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(userSettingsInputSchema))
    dto: UserSettingsInput,
  ) {
    return this.usersService.updateSettings(userId, dto);
  }

  // ── Stats ─────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Get user profile statistics overview' })
  @ApiOkResponse({ description: 'User stats (totals, streak, etc.)' })
  async getStats(@CurrentUser('sub') userId: string) {
    return this.userStatsService.getStats(userId);
  }

  @Get('stats/weekly')
  @ApiOperation({ summary: 'Get chart stats (weekly or monthly buckets)' })
  @ApiQuery({ name: 'range', required: false, enum: ['12w', 'year', 'all'] })
  @ApiQuery({
    name: 'metric',
    required: false,
    enum: ['duration', 'reps'],
  })
  @ApiOkResponse({ description: 'Chart bucket data' })
  async getWeeklyStats(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(chartStatsFilterSchema))
    filter: ChartStatsFilter,
  ) {
    return this.userStatsService.getChartStats(userId, filter);
  }

  @Get('stats/calendar')
  @ApiOperation({ summary: 'Get calendar heatmap data for a month' })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiOkResponse({ description: 'Calendar workout days for the month' })
  async getCalendarStats(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(calendarStatsFilterSchema))
    filter: CalendarStatsFilter,
  ) {
    return this.userStatsService.getCalendarStats(userId, filter);
  }
}
