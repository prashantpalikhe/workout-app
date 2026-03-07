import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { ProgramFoldersController } from './program-folders.controller';
import { ProgramsService } from './programs.service';
import { ProgramFoldersService } from './program-folders.service';

@Module({
  controllers: [ProgramsController, ProgramFoldersController],
  providers: [ProgramsService, ProgramFoldersService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
