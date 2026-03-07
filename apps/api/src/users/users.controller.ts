import { Controller, Get, Patch, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
  ApiQuery,
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
import { CurrentUser, ZodValidationPipe, zodToOpenApi } from '../common';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users/me')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userStatsService: UserStatsService,
  ) {}

  // ── User ────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiOkResponse({ description: 'Current user data' })
  async getMe(@CurrentUser('sub') userId: string) {
    const user = await this.usersService.findByIdOrThrow(userId);
    const { passwordHash, ...rest } = user;
    return rest;
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
