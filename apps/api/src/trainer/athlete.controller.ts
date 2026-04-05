import { Controller, Get, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TrainerService } from './trainer.service';
import { CurrentUser } from '../common';

/**
 * Athlete-side endpoints for managing trainer relationships.
 */
@ApiTags('athlete-trainers')
@ApiBearerAuth('access-token')
@Controller('athlete/trainers')
export class AthleteController {
  constructor(private readonly trainerService: TrainerService) {}

  @Get()
  @ApiOperation({ summary: 'List my trainers' })
  @ApiOkResponse({ description: 'List of trainer relationships' })
  async listTrainers(@CurrentUser('sub') athleteId: string) {
    return this.trainerService.listTrainers(athleteId);
  }

  @Post(':id/disconnect')
  @ApiOperation({ summary: 'Permanently disconnect from a trainer' })
  @ApiOkResponse({ description: 'Relationship disconnected' })
  async disconnect(
    @CurrentUser('sub') athleteId: string,
    @Param('id', ParseUUIDPipe) relationshipId: string,
  ) {
    await this.trainerService.disconnect(athleteId, relationshipId);
    return { message: 'Disconnected from trainer' };
  }
}
