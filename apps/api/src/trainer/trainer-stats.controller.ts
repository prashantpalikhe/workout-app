import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
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
  chartStatsFilterSchema,
  calendarStatsFilterSchema,
  type PersonalRecordFilter,
  type ChartStatsFilter,
  type CalendarStatsFilter,
} from '@workout/shared';
import { RecordsService } from '../records';
import { UserStatsService } from '../users';
import { ZodValidationPipe, IsTrainer } from '../common';
import { TrainerGuard } from '../common/guards/trainer.guard';
import { TrainerAccessGuard } from '../common/guards/trainer-access.guard';

@ApiTags('trainer-stats')
@ApiBearerAuth('access-token')
@IsTrainer()
@UseGuards(TrainerGuard, TrainerAccessGuard)
@Controller('trainer/athletes/:athleteId')
export class TrainerStatsController {
  constructor(
    private readonly recordsService: RecordsService,
    private readonly userStatsService: UserStatsService,
  ) {}

  // ── Records ───────────────────────────────────

  @Get('records')
  @ApiOperation({ summary: "List athlete's personal records" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'exerciseId', required: false, type: String })
  @ApiQuery({ name: 'prType', required: false, type: String })
  @ApiOkResponse({ description: 'Paginated list of personal records' })
  async findRecords(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Query(new ZodValidationPipe(personalRecordFilterSchema))
    filter: PersonalRecordFilter,
  ) {
    return this.recordsService.findAll(athleteId, filter);
  }

  @Get('records/exercise/:exerciseId')
  @ApiOperation({ summary: "Get athlete's best PRs for a specific exercise" })
  @ApiOkResponse({ description: 'Best PR per type for this exercise' })
  async findRecordsByExercise(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    return this.recordsService.findByExercise(athleteId, exerciseId);
  }

  // ── Stats ─────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: "Get athlete's profile statistics overview" })
  @ApiOkResponse({ description: 'Stats (totals, streak, etc.)' })
  async getStats(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
  ) {
    return this.userStatsService.getStats(athleteId);
  }

  @Get('stats/weekly')
  @ApiOperation({ summary: "Get athlete's chart stats (weekly or monthly)" })
  @ApiQuery({ name: 'range', required: false, enum: ['12w', 'year', 'all'] })
  @ApiQuery({ name: 'metric', required: false, enum: ['duration', 'reps'] })
  @ApiOkResponse({ description: 'Chart bucket data' })
  async getWeeklyStats(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Query(new ZodValidationPipe(chartStatsFilterSchema))
    filter: ChartStatsFilter,
  ) {
    return this.userStatsService.getChartStats(athleteId, filter);
  }

  @Get('stats/calendar')
  @ApiOperation({ summary: "Get athlete's calendar heatmap data" })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiOkResponse({ description: 'Calendar workout days for the month' })
  async getCalendarStats(
    @Param('athleteId', ParseUUIDPipe) athleteId: string,
    @Query(new ZodValidationPipe(calendarStatsFilterSchema))
    filter: CalendarStatsFilter,
  ) {
    return this.userStatsService.getCalendarStats(athleteId, filter);
  }
}
