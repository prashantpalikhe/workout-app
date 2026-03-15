import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { ProgramFoldersController } from './program-folders.controller';
import { AssignmentsController } from './assignments.controller';
import { ProgramsService } from './programs.service';
import { ProgramFoldersService } from './program-folders.service';

@Module({
  controllers: [ProgramsController, ProgramFoldersController, AssignmentsController],
  providers: [ProgramsService, ProgramFoldersService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
