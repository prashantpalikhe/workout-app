import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  personalRecordFilterSchema,
  checkPRInputSchema,
  type PersonalRecordFilter,
  type CheckPRInput,
} from '@workout/shared';
import { RecordsService } from './records.service';
import { CurrentUser, ZodValidationPipe, zodToOpenApi } from '../common';

@ApiTags('records')
@ApiBearerAuth('access-token')
@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get()
  @ApiOperation({ summary: 'List all personal records for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'exerciseId', required: false, type: String })
  @ApiQuery({ name: 'prType', required: false, type: String })
  @ApiOkResponse({ description: 'Paginated list of personal records' })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(personalRecordFilterSchema))
    filter: PersonalRecordFilter,
  ) {
    return this.recordsService.findAll(userId, filter);
  }

  @Post('check-pr')
  @ApiOperation({ summary: 'Check if set data would be a new PR' })
  @ApiBody({ schema: zodToOpenApi(checkPRInputSchema) })
  @ApiOkResponse({ description: 'PR check result' })
  async checkPR(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(checkPRInputSchema)) input: CheckPRInput,
  ) {
    return this.recordsService.checkPR(userId, input);
  }

  @Get('exercise/:exerciseId')
  @ApiOperation({ summary: 'Get current best PRs for a specific exercise' })
  @ApiOkResponse({ description: 'Best PR per type for this exercise' })
  async findByExercise(
    @CurrentUser('sub') userId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    return this.recordsService.findByExercise(userId, exerciseId);
  }
}
