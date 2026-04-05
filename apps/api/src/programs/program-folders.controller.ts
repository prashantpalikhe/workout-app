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
  createProgramFolderInputSchema,
  type CreateProgramFolderInput,
} from '@workout/shared';
import { ProgramFoldersService } from './program-folders.service';
import { CurrentUser, ZodValidationPipe, zodToOpenApi } from '../common';

@ApiTags('program-folders')
@ApiBearerAuth('access-token')
@Controller('program-folders')
export class ProgramFoldersController {
  constructor(private readonly programFoldersService: ProgramFoldersService) {}

  @Get()
  @ApiOperation({ summary: 'List user program folders' })
  @ApiOkResponse({ description: 'List of program folders' })
  async findAll(@CurrentUser('sub') userId: string) {
    return this.programFoldersService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a program folder' })
  @ApiBody({ schema: zodToOpenApi(createProgramFolderInputSchema) })
  @ApiCreatedResponse({ description: 'Created folder' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createProgramFolderInputSchema))
    dto: CreateProgramFolderInput,
  ) {
    return this.programFoldersService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a program folder' })
  @ApiBody({
    schema: zodToOpenApi(createProgramFolderInputSchema.partial()),
  })
  @ApiOkResponse({ description: 'Updated folder' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createProgramFolderInputSchema.partial()))
    dto: Partial<CreateProgramFolderInput>,
  ) {
    return this.programFoldersService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a program folder' })
  @ApiNoContentResponse({
    description: 'Folder deleted, programs become ungrouped',
  })
  async delete(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.programFoldersService.delete(userId, id);
  }
}
