import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
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
  createExerciseInputSchema,
  updateExerciseInputSchema,
  exerciseFilterSchema,
  exerciseStatsFilterSchema,
  exerciseHistoryFilterSchema,
  type CreateExerciseInput,
  type UpdateExerciseInput,
  type ExerciseFilter,
  type ExerciseStatsFilter,
  type ExerciseHistoryFilter,
} from '@workout/shared';
import { ExercisesService } from './exercises.service';
import { CurrentUser, ZodValidationPipe, zodToOpenApi } from '../common';

@ApiTags('exercises')
@ApiBearerAuth('access-token')
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'List exercises (global + user custom)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'equipment', required: false, type: String })
  @ApiQuery({ name: 'movementPattern', required: false, type: String })
  @ApiQuery({ name: 'muscleGroupId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({ description: 'Paginated list of exercises' })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(exerciseFilterSchema)) filters: ExerciseFilter,
  ) {
    return this.exercisesService.findAll(userId, filters);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get exercise statistics (time-series for charts)' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['12w', '6m', '1y', 'all'],
  })
  @ApiOkResponse({ description: 'Exercise statistics data points' })
  async getStatistics(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(exerciseStatsFilterSchema))
    filter: ExerciseStatsFilter,
  ) {
    return this.exercisesService.getStatistics(userId, id, filter);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get exercise session history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated exercise session history' })
  async getHistory(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(exerciseHistoryFilterSchema))
    filter: ExerciseHistoryFilter,
  ) {
    return this.exercisesService.getHistory(userId, id, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exercise by ID' })
  @ApiOkResponse({ description: 'Exercise detail with muscle groups' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.exercisesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom exercise' })
  @ApiBody({ schema: zodToOpenApi(createExerciseInputSchema) })
  @ApiCreatedResponse({ description: 'Created exercise' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createExerciseInputSchema))
    dto: CreateExerciseInput,
  ) {
    return this.exercisesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom exercise' })
  @ApiBody({ schema: zodToOpenApi(updateExerciseInputSchema) })
  @ApiOkResponse({ description: 'Updated exercise' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateExerciseInputSchema))
    dto: UpdateExerciseInput,
  ) {
    return this.exercisesService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom exercise' })
  @ApiNoContentResponse({ description: 'Exercise deleted' })
  async delete(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.exercisesService.delete(userId, id);
  }
}
