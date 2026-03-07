import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  createSessionSetInputSchema,
  updateSessionSetInputSchema,
  type CreateSessionSetInput,
  type UpdateSessionSetInput,
} from '@workout/shared';
import { SessionSetsService } from './session-sets.service';
import { CurrentUser, ZodValidationPipe, zodToOpenApi } from '../common';

@ApiTags('session-sets')
@ApiBearerAuth('access-token')
@Controller('sessions/:sessionId/exercises/:exerciseId/sets')
export class SessionSetsController {
  constructor(private readonly sessionSetsService: SessionSetsService) {}

  @Post()
  @ApiOperation({ summary: 'Log a set' })
  @ApiBody({ schema: zodToOpenApi(createSessionSetInputSchema) })
  @ApiCreatedResponse({ description: 'Created session set' })
  async create(
    @CurrentUser('sub') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) sessionExerciseId: string,
    @Body(new ZodValidationPipe(createSessionSetInputSchema))
    dto: CreateSessionSetInput,
  ) {
    return this.sessionSetsService.create(
      userId,
      sessionId,
      sessionExerciseId,
      dto,
    );
  }

  @Patch(':setId')
  @ApiOperation({ summary: 'Update a set' })
  @ApiBody({ schema: zodToOpenApi(updateSessionSetInputSchema) })
  @ApiOkResponse({ description: 'Updated session set' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) sessionExerciseId: string,
    @Param('setId', ParseUUIDPipe) setId: string,
    @Body(new ZodValidationPipe(updateSessionSetInputSchema))
    dto: UpdateSessionSetInput,
  ) {
    return this.sessionSetsService.update(
      userId,
      sessionId,
      sessionExerciseId,
      setId,
      dto,
    );
  }

  @Delete(':setId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a set' })
  @ApiNoContentResponse({ description: 'Session set deleted' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) sessionExerciseId: string,
    @Param('setId', ParseUUIDPipe) setId: string,
  ) {
    await this.sessionSetsService.remove(
      userId,
      sessionId,
      sessionExerciseId,
      setId,
    );
  }
}
