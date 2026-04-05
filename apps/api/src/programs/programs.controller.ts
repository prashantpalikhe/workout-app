import {
  Controller,
  Get,
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
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  createProgramInputSchema,
  updateProgramInputSchema,
  createProgramExerciseInputSchema,
  updateProgramExerciseInputSchema,
  reorderInputSchema,
  type CreateProgramInput,
  type UpdateProgramInput,
  type CreateProgramExerciseInput,
  type UpdateProgramExerciseInput,
  type ReorderInput,
} from '@workout/shared';
import { ProgramsService } from './programs.service';
import { CurrentUser, ZodValidationPipe, zodToOpenApi } from '../common';

@ApiTags('programs')
@ApiBearerAuth('access-token')
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  @ApiOperation({ summary: 'List user programs' })
  @ApiOkResponse({
    description: 'List of programs with exercises and folder info',
  })
  async findAll(@CurrentUser('sub') userId: string) {
    return this.programsService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a program' })
  @ApiBody({ schema: zodToOpenApi(createProgramInputSchema) })
  @ApiCreatedResponse({ description: 'Created program' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createProgramInputSchema))
    dto: CreateProgramInput,
  ) {
    return this.programsService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get program detail' })
  @ApiOkResponse({ description: 'Program with exercises' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.programsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a program' })
  @ApiBody({ schema: zodToOpenApi(updateProgramInputSchema) })
  @ApiOkResponse({ description: 'Updated program' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateProgramInputSchema))
    dto: UpdateProgramInput,
  ) {
    return this.programsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a program' })
  @ApiNoContentResponse({ description: 'Program and its exercises deleted' })
  async delete(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.programsService.delete(userId, id);
  }

  // Program Exercise routes
  // IMPORTANT: reorder must come before :exerciseId to avoid param collision

  @Post(':id/exercises')
  @ApiOperation({ summary: 'Add exercise to program' })
  @ApiBody({ schema: zodToOpenApi(createProgramExerciseInputSchema) })
  @ApiCreatedResponse({ description: 'Added program exercise' })
  async addExercise(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) programId: string,
    @Body(new ZodValidationPipe(createProgramExerciseInputSchema))
    dto: CreateProgramExerciseInput,
  ) {
    return this.programsService.addExercise(userId, programId, dto);
  }

  @Patch(':id/exercises/reorder')
  @ApiOperation({ summary: 'Reorder program exercises' })
  @ApiBody({ schema: zodToOpenApi(reorderInputSchema) })
  @ApiOkResponse({ description: 'Program with reordered exercises' })
  async reorderExercises(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) programId: string,
    @Body(new ZodValidationPipe(reorderInputSchema))
    items: ReorderInput,
  ) {
    return this.programsService.reorderExercises(userId, programId, items);
  }

  @Patch(':id/exercises/:exerciseId')
  @ApiOperation({ summary: 'Update a program exercise' })
  @ApiBody({ schema: zodToOpenApi(updateProgramExerciseInputSchema) })
  @ApiOkResponse({ description: 'Updated program exercise' })
  async updateExercise(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) programId: string,
    @Param('exerciseId', ParseUUIDPipe) programExerciseId: string,
    @Body(new ZodValidationPipe(updateProgramExerciseInputSchema))
    dto: UpdateProgramExerciseInput,
  ) {
    return this.programsService.updateExercise(
      userId,
      programId,
      programExerciseId,
      dto,
    );
  }

  @Delete(':id/exercises/:exerciseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove exercise from program' })
  @ApiNoContentResponse({ description: 'Program exercise removed' })
  async removeExercise(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) programId: string,
    @Param('exerciseId', ParseUUIDPipe) programExerciseId: string,
  ) {
    await this.programsService.removeExercise(
      userId,
      programId,
      programExerciseId,
    );
  }
}
