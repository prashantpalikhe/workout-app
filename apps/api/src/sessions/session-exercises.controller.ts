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
  addSessionExerciseInputSchema,
  updateSessionExerciseInputSchema,
  type AddSessionExerciseInput,
  type UpdateSessionExerciseInput,
} from '@workout/shared';
import { SessionExercisesService } from './session-exercises.service';
import { CurrentUser, ZodValidationPipe, zodToOpenApi } from '../common';

@ApiTags('session-exercises')
@ApiBearerAuth('access-token')
@Controller('sessions/:sessionId/exercises')
export class SessionExercisesController {
  constructor(
    private readonly sessionExercisesService: SessionExercisesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add exercise to session' })
  @ApiBody({ schema: zodToOpenApi(addSessionExerciseInputSchema) })
  @ApiCreatedResponse({ description: 'Added session exercise' })
  async add(
    @CurrentUser('sub') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body(new ZodValidationPipe(addSessionExerciseInputSchema))
    dto: AddSessionExerciseInput,
  ) {
    return this.sessionExercisesService.add(userId, sessionId, dto);
  }

  @Patch(':exerciseId')
  @ApiOperation({ summary: 'Update a session exercise' })
  @ApiBody({ schema: zodToOpenApi(updateSessionExerciseInputSchema) })
  @ApiOkResponse({ description: 'Updated session exercise' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) sessionExerciseId: string,
    @Body(new ZodValidationPipe(updateSessionExerciseInputSchema))
    dto: UpdateSessionExerciseInput,
  ) {
    return this.sessionExercisesService.update(
      userId,
      sessionId,
      sessionExerciseId,
      dto,
    );
  }

  @Delete(':exerciseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove exercise from session' })
  @ApiNoContentResponse({ description: 'Session exercise removed' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) sessionExerciseId: string,
  ) {
    await this.sessionExercisesService.remove(
      userId,
      sessionId,
      sessionExerciseId,
    );
  }
}
