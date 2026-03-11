import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  personalRecordFilterSchema,
  type PersonalRecordFilter,
} from '@workout/shared';
import { RecordsService } from './records.service';
import { CurrentUser, ZodValidationPipe } from '../common';

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
