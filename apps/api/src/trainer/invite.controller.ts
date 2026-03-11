import {
  Controller,
  Get,
  Post,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TrainerService } from './trainer.service';
import { CurrentUser } from '../common';

/**
 * Invite endpoints accessible by any authenticated user (not trainer-only).
 * Used by athletes to view and accept trainer invites.
 */
@ApiTags('trainer-invites')
@ApiBearerAuth('access-token')
@Controller('trainer/invites')
export class InviteController {
  constructor(private readonly trainerService: TrainerService) {}

  @Get(':token/info')
  @ApiOperation({ summary: 'Get invite details (trainer name, etc.)' })
  @ApiOkResponse({ description: 'Invite details' })
  async getInviteInfo(@Param('token') token: string) {
    const invite = await this.trainerService.getInviteByToken(token);
    return {
      id: invite.id,
      trainer: invite.trainer,
      expiresAt: invite.expiresAt,
    };
  }

  @Post(':token/accept')
  @ApiOperation({ summary: 'Accept a trainer invite' })
  @ApiCreatedResponse({ description: 'Relationship created' })
  async acceptInvite(
    @CurrentUser('sub') athleteId: string,
    @Param('token') token: string,
  ) {
    return this.trainerService.acceptInvite(athleteId, token);
  }
}
