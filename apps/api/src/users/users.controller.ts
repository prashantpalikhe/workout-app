import { Controller, Get, Patch, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  updateUserInputSchema,
  athleteProfileInputSchema,
  userSettingsInputSchema,
  type UpdateUserInput,
  type AthleteProfileInput,
  type UserSettingsInput,
} from '@workout/shared';
import { UsersService } from './users.service';
import { CurrentUser, ZodValidationPipe, zodToOpenApi } from '../common';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
