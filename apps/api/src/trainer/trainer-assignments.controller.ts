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
  UseGuards,
  ForbiddenException,
  NotFoundException,
  ConflictException,
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
  createAssignmentInputSchema,
  updateAssignmentInputSchema,
  type CreateAssignmentInput,
  type UpdateAssignmentInput,
} from '@workout/shared';
import type { ProgramAssignmentStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma';
import { ProgramsService } from '../programs';
import {
  CurrentUser,
  ZodValidationPipe,
  zodToOpenApi,
  IsTrainer,
} from '../common';
import { TrainerGuard } from '../common/guards/trainer.guard';

@ApiTags('trainer-assignments')
@ApiBearerAuth('access-token')
@IsTrainer()
@UseGuards(TrainerGuard)
@Controller('trainer')
export class TrainerAssignmentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programsService: ProgramsService,
  ) {}

  @Get('athletes/:athleteId/assignments')
  @ApiOperation({ summary: "List athlete's program assignments" })
  @ApiOkResponse({ description: 'List of assignments' })
  async listForAthlete(
    @CurrentUser('sub') trainerId: string,
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
  ) {
    // Verify ACTIVE relationship
    await this.assertActiveRelationship(trainerId, athleteId);

    return this.prisma.programAssignment.findMany({
      where: { athleteId, assignedById: trainerId },
      include: {
        program: { select: { id: true, name: true, sourceProgramId: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  @Post('assignments')
  @ApiOperation({ summary: 'Assign a program to an athlete' })
  @ApiBody({ schema: zodToOpenApi(createAssignmentInputSchema) })
  @ApiCreatedResponse({ description: 'Created assignment' })
  async create(
    @CurrentUser('sub') trainerId: string,
    @Body(new ZodValidationPipe(createAssignmentInputSchema))
    dto: CreateAssignmentInput,
  ) {
    // Verify ACTIVE relationship with the athlete
    await this.assertActiveRelationship(trainerId, dto.athleteId);

    // Verify the program belongs to the trainer
    const program = await this.prisma.program.findUnique({
      where: { id: dto.programId },
    });

    if (!program) {
      throw new NotFoundException(
        `Program with id "${dto.programId}" not found`,
      );
    }

    if (program.createdById !== trainerId) {
      throw new ForbiddenException('You can only assign your own programs');
    }

    // Prevent duplicate active assignment of the same program template
    const existingAssignment = await this.prisma.programAssignment.findFirst({
      where: {
        athleteId: dto.athleteId,
        assignedById: trainerId,
        status: 'ACTIVE',
        program: { sourceProgramId: dto.programId },
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        'This program is already assigned to the athlete',
      );
    }

    // Create an independent copy for the athlete
    const copiedProgram = await this.programsService.copyProgram(
      dto.programId,
      dto.athleteId,
      trainerId,
    );

    return this.prisma.programAssignment.create({
      data: {
        programId: copiedProgram.id,
        athleteId: dto.athleteId,
        assignedById: trainerId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        allowSessionDeviations: dto.allowSessionDeviations,
      },
      include: {
        program: { select: { id: true, name: true, sourceProgramId: true } },
        athlete: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  @Patch('assignments/:id')
  @ApiOperation({ summary: 'Update a program assignment' })
  @ApiBody({ schema: zodToOpenApi(updateAssignmentInputSchema) })
  @ApiOkResponse({ description: 'Updated assignment' })
  async update(
    @CurrentUser('sub') trainerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateAssignmentInputSchema))
    dto: UpdateAssignmentInput,
  ) {
    const assignment = await this.findOwnedAssignment(id, trainerId);

    const { status, ...rest } = dto;

    return this.prisma.programAssignment.update({
      where: { id: assignment.id },
      data: {
        ...rest,
        ...(rest.startDate && { startDate: new Date(rest.startDate) }),
        ...(status && { status: status as ProgramAssignmentStatus }),
      },
      include: {
        program: { select: { id: true, name: true } },
      },
    });
  }

  @Delete('assignments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel/delete a program assignment' })
  @ApiNoContentResponse({ description: 'Assignment deleted' })
  async remove(
    @CurrentUser('sub') trainerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const assignment = await this.findOwnedAssignment(id, trainerId);

    // Get the program to check if it's a copy
    const program = await this.prisma.program.findUnique({
      where: { id: assignment.programId },
    });

    await this.prisma.programAssignment.delete({
      where: { id: assignment.id },
    });

    // Also delete the copied program (cascade removes ProgramExercises)
    if (program?.sourceProgramId) {
      await this.prisma.program.delete({
        where: { id: program.id },
      });
    }
  }

  // ── Helpers ───────────────────────────────────

  private async assertActiveRelationship(trainerId: string, athleteId: string) {
    const relationship = await this.prisma.trainerAthlete.findFirst({
      where: { trainerId, athleteId, status: 'ACTIVE' },
    });

    if (!relationship) {
      throw new ForbiddenException(
        'You do not have an active relationship with this athlete',
      );
    }

    return relationship;
  }

  private async findOwnedAssignment(id: string, trainerId: string) {
    const assignment = await this.prisma.programAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with id "${id}" not found`);
    }

    if (assignment.assignedById !== trainerId) {
      throw new ForbiddenException('You can only manage your own assignments');
    }

    return assignment;
  }
}
