import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import {
  createInviteLinkInputSchema,
  updateRelationshipInputSchema,
  trainerAthleteFilterSchema,
  type CreateInviteLinkInput,
  type UpdateRelationshipInput,
  type TrainerAthleteFilter,
} from '@workout/shared';
import { TrainerService } from './trainer.service';
import {
  CurrentUser,
  ZodValidationPipe,
  TrainerGuard,
  zodToOpenApi,
  IsTrainer,
} from '../common';

@ApiTags('trainer')
@ApiBearerAuth('access-token')
@Controller('trainer')
@IsTrainer()
@UseGuards(TrainerGuard)
export class TrainerController {
  constructor(private readonly trainerService: TrainerService) {}

  // ── Invites ───────────────────────────────────

  @Post('invites')
  @ApiOperation({ summary: 'Create a shareable invite link' })
  @ApiBody({ schema: zodToOpenApi(createInviteLinkInputSchema) })
  @ApiCreatedResponse({ description: 'Created invite' })
  async createInvite(
    @CurrentUser('sub') trainerId: string,
    @Body(new ZodValidationPipe(createInviteLinkInputSchema))
    dto: CreateInviteLinkInput,
  ) {
    const invite = await this.trainerService.createInvite(
      trainerId,
      dto.expiresInHours,
    );
    return {
      id: invite.id,
      token: invite.token,
      expiresAt: invite.expiresAt,
    };
  }

  @Get('invites')
  @ApiOperation({ summary: 'List active invites' })
  @ApiOkResponse({ description: 'List of active invites' })
  async listInvites(@CurrentUser('sub') trainerId: string) {
    return this.trainerService.listInvites(trainerId);
  }

  @Delete('invites/:id')
  @ApiOperation({ summary: 'Revoke an invite' })
  @ApiOkResponse({ description: 'Invite revoked' })
  async revokeInvite(
    @CurrentUser('sub') trainerId: string,
    @Param('id', ParseUUIDPipe) inviteId: string,
  ) {
    await this.trainerService.revokeInvite(trainerId, inviteId);
    return { message: 'Invite revoked' };
  }

  // ── Athletes ──────────────────────────────────

  @Get('athletes')
  @ApiOperation({ summary: 'List connected athletes' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated athlete list' })
  async listAthletes(
    @CurrentUser('sub') trainerId: string,
    @Query(new ZodValidationPipe(trainerAthleteFilterSchema))
    filters: TrainerAthleteFilter,
  ) {
    return this.trainerService.listAthletes(trainerId, filters);
  }

  @Patch('athletes/:id')
  @ApiOperation({ summary: 'Update athlete relationship status' })
  @ApiBody({ schema: zodToOpenApi(updateRelationshipInputSchema) })
  @ApiOkResponse({ description: 'Updated relationship' })
  async updateRelationship(
    @CurrentUser('sub') trainerId: string,
    @Param('id', ParseUUIDPipe) relationshipId: string,
    @Body(new ZodValidationPipe(updateRelationshipInputSchema))
    dto: UpdateRelationshipInput,
  ) {
    return this.trainerService.updateRelationship(
      trainerId,
      relationshipId,
      dto.status,
    );
  }

  @Get('athletes/:athleteId/profile')
  @ApiOperation({ summary: 'View athlete profile' })
  @ApiOkResponse({ description: 'Athlete profile data' })
  async getAthleteProfile(
    @CurrentUser('sub') trainerId: string,
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
  ) {
    return this.trainerService.getAthleteProfile(trainerId, athleteId);
  }
}
