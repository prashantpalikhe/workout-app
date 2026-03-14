import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
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
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  startSessionInputSchema,
  updateSessionInputSchema,
  completeSessionInputSchema,
  sessionHistoryFilterSchema,
  type StartSessionInput,
  type UpdateSessionInput,
  type CompleteSessionInput,
  type SessionHistoryFilter,
} from '@workout/shared';
import { SessionsService } from './sessions.service';
import { CurrentUser, ZodValidationPipe, zodToOpenApi } from '../common';

@ApiTags('sessions')
@ApiBearerAuth('access-token')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  // IMPORTANT: literal paths must come before :id to avoid param collision

  @Get('assignments')
  @ApiOperation({ summary: 'List my active program assignments' })
  @ApiOkResponse({ description: 'Active program assignments with program name' })
  async myAssignments(@CurrentUser('sub') userId: string) {
    return this.sessionsService.listStartablePrograms(userId);
  }

  @Post('start')
  @ApiOperation({ summary: 'Start a new workout session' })
  @ApiBody({ schema: zodToOpenApi(startSessionInputSchema) })
  @ApiCreatedResponse({ description: 'Created session' })
  async start(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(startSessionInputSchema))
    dto: StartSessionInput,
  ) {
    return this.sessionsService.start(userId, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get current in-progress session' })
  @ApiOkResponse({ description: 'Active session or null' })
  async findActive(@CurrentUser('sub') userId: string) {
    return this.sessionsService.findActive(userId);
  }

  @Get()
  @ApiOperation({ summary: 'List session history (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiOkResponse({ description: 'Paginated session history' })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(sessionHistoryFilterSchema))
    filters: SessionHistoryFilter,
  ) {
    return this.sessionsService.findAll(userId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session detail' })
  @ApiOkResponse({ description: 'Session with exercises and sets' })
  async findById(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionsService.findById(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a session' })
  @ApiBody({ schema: zodToOpenApi(updateSessionInputSchema) })
  @ApiOkResponse({ description: 'Updated session' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSessionInputSchema))
    dto: UpdateSessionInput,
  ) {
    return this.sessionsService.update(userId, id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a session' })
  @ApiBody({ schema: zodToOpenApi(completeSessionInputSchema) })
  @ApiOkResponse({ description: 'Completed session' })
  async complete(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(completeSessionInputSchema))
    dto: CompleteSessionInput,
  ) {
    return this.sessionsService.complete(userId, id, dto);
  }

  @Post(':id/abandon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Abandon a session' })
  @ApiOkResponse({ description: 'Abandoned session' })
  async abandon(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionsService.abandon(userId, id);
  }
}
