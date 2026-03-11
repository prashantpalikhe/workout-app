import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { SessionsModule } from '../sessions';
import { RecordsModule } from '../records';
import { UsersModule } from '../users';
import { TrainerController } from './trainer.controller';
import { InviteController } from './invite.controller';
import { AthleteController } from './athlete.controller';
import { TrainerSessionsController } from './trainer-sessions.controller';
import { TrainerStatsController } from './trainer-stats.controller';
import { TrainerAssignmentsController } from './trainer-assignments.controller';
import { TrainerService } from './trainer.service';

@Module({
  imports: [PrismaModule, SessionsModule, RecordsModule, UsersModule],
  controllers: [
    TrainerController,
    InviteController,
    AthleteController,
    TrainerSessionsController,
    TrainerStatsController,
    TrainerAssignmentsController,
  ],
  providers: [TrainerService],
  exports: [TrainerService],
})
export class TrainerModule {}
