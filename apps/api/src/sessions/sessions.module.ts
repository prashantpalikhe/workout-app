import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionExercisesController } from './session-exercises.controller';
import { SessionSetsController } from './session-sets.controller';
import { SessionsService } from './sessions.service';
import { SessionExercisesService } from './session-exercises.service';
import { SessionSetsService } from './session-sets.service';
import { RecordsModule } from '../records';

@Module({
  imports: [RecordsModule],
  controllers: [
    SessionsController,
    SessionExercisesController,
    SessionSetsController,
  ],
  providers: [SessionsService, SessionExercisesService, SessionSetsService],
  exports: [SessionsService],
})
export class SessionsModule {}
