import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  startSessionInputSchema,
  updateSessionInputSchema,
  completeSessionInputSchema,
  sessionHistoryFilterSchema,
  addSessionExerciseInputSchema,
  updateSessionExerciseInputSchema,
  createSessionSetInputSchema,
  updateSessionSetInputSchema,
  type StartSessionInput,
  type UpdateSessionInput,
  type CompleteSessionInput,
  type SessionHistoryFilter,
  type AddSessionExerciseInput,
  type UpdateSessionExerciseInput,
  type CreateSessionSetInput,
  type UpdateSessionSetInput,
} from '@workout/shared';
import { SessionsService } from '../sessions/sessions.service';
import { SessionExercisesService } from '../sessions/session-exercises.service';
import { SessionSetsService } from '../sessions/session-sets.service';
import {
  CurrentUser,
  ZodValidationPipe,
  zodToOpenApi,
  IsTrainer,
} from '../common';
import { TrainerGuard } from '../common/guards/trainer.guard';
import { TrainerAccessGuard } from '../common/guards/trainer-access.guard';

@ApiTags('trainer-sessions')
@ApiBearerAuth('access-token')
@IsTrainer()
@UseGuards(TrainerGuard, TrainerAccessGuard)
@Controller('trainer/athletes/:athleteId/sessions')
export class TrainerSessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionExercisesService: SessionExercisesService,
    private readonly sessionSetsService: SessionSetsService,
  ) {}

  // ── Session CRUD ──────────────────────────────

  @Post('start')
  @ApiOperation({ summary: 'Start a workout session on behalf of an athlete' })
  @ApiBody({ schema: zodToOpenApi(startSessionInputSchema) })
  @ApiCreatedResponse({ description: 'Created session' })
  async start(
    @CurrentUser('sub') trainerId: string,
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Body(new ZodValidationPipe(startSessionInputSchema))
    dto: StartSessionInput,
  ) {
    return this.sessionsService.start(athleteId, dto, trainerId);
  }

  @Get('active')
  @ApiOperation({ summary: "Get athlete's active session" })
  @ApiOkResponse({ description: 'Active session or null' })
  async findActive(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
  ) {
    return this.sessionsService.findActive(athleteId);
  }

  @Get()
  @ApiOperation({ summary: "List athlete's session history" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiOkResponse({ description: 'Paginated session history' })
  async findAll(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Query(new ZodValidationPipe(sessionHistoryFilterSchema))
    filters: SessionHistoryFilter,
  ) {
    return this.sessionsService.findAll(athleteId, filters);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get session detail' })
  @ApiOkResponse({ description: 'Session with exercises and sets' })
  async findById(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.sessionsService.findById(athleteId, sessionId);
  }

  @Patch(':sessionId')
  @ApiOperation({ summary: 'Update a session' })
  @ApiBody({ schema: zodToOpenApi(updateSessionInputSchema) })
  @ApiOkResponse({ description: 'Updated session' })
  async update(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body(new ZodValidationPipe(updateSessionInputSchema))
    dto: UpdateSessionInput,
  ) {
    return this.sessionsService.update(athleteId, sessionId, dto);
  }

  @Post(':sessionId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a session' })
  @ApiBody({ schema: zodToOpenApi(completeSessionInputSchema) })
  @ApiOkResponse({ description: 'Completed session' })
  async complete(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body(new ZodValidationPipe(completeSessionInputSchema))
    dto: CompleteSessionInput,
  ) {
    return this.sessionsService.complete(athleteId, sessionId, dto);
  }

  @Post(':sessionId/abandon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Abandon a session' })
  @ApiOkResponse({ description: 'Abandoned session' })
  async abandon(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.sessionsService.abandon(athleteId, sessionId);
  }

  // ── Session Exercises ─────────────────────────

  @Post(':sessionId/exercises')
  @ApiOperation({ summary: 'Add exercise to session' })
  @ApiBody({ schema: zodToOpenApi(addSessionExerciseInputSchema) })
  @ApiCreatedResponse({ description: 'Added session exercise' })
  async addExercise(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body(new ZodValidationPipe(addSessionExerciseInputSchema))
    dto: AddSessionExerciseInput,
  ) {
    return this.sessionExercisesService.add(athleteId, sessionId, dto);
  }

  @Patch(':sessionId/exercises/:exerciseId')
  @ApiOperation({ summary: 'Update a session exercise' })
  @ApiBody({ schema: zodToOpenApi(updateSessionExerciseInputSchema) })
  @ApiOkResponse({ description: 'Updated session exercise' })
  async updateExercise(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body(new ZodValidationPipe(updateSessionExerciseInputSchema))
    dto: UpdateSessionExerciseInput,
  ) {
    return this.sessionExercisesService.update(
      athleteId,
      sessionId,
      exerciseId,
      dto,
    );
  }

  @Delete(':sessionId/exercises/:exerciseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove exercise from session' })
  @ApiNoContentResponse({ description: 'Session exercise removed' })
  async removeExercise(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    await this.sessionExercisesService.remove(athleteId, sessionId, exerciseId);
  }

  // ── Session Sets ──────────────────────────────

  @Post(':sessionId/exercises/:exerciseId/sets')
  @ApiOperation({ summary: 'Log a set' })
  @ApiBody({ schema: zodToOpenApi(createSessionSetInputSchema) })
  @ApiCreatedResponse({ description: 'Created session set' })
  async createSet(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body(new ZodValidationPipe(createSessionSetInputSchema))
    dto: CreateSessionSetInput,
  ) {
    return this.sessionSetsService.create(
      athleteId,
      sessionId,
      exerciseId,
      dto,
    );
  }

  @Patch(':sessionId/exercises/:exerciseId/sets/:setId')
  @ApiOperation({ summary: 'Update a set' })
  @ApiBody({ schema: zodToOpenApi(updateSessionSetInputSchema) })
  @ApiOkResponse({ description: 'Updated session set' })
  async updateSet(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Param('setId', ParseUUIDPipe) setId: string,
    @Body(new ZodValidationPipe(updateSessionSetInputSchema))
    dto: UpdateSessionSetInput,
  ) {
    return this.sessionSetsService.update(
      athleteId,
      sessionId,
      exerciseId,
      setId,
      dto,
    );
  }

  @Delete(':sessionId/exercises/:exerciseId/sets/:setId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a set' })
  @ApiNoContentResponse({ description: 'Session set deleted' })
  async removeSet(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Param('setId', ParseUUIDPipe) setId: string,
  ) {
    await this.sessionSetsService.remove(
      athleteId,
      sessionId,
      exerciseId,
      setId,
    );
  }
}
