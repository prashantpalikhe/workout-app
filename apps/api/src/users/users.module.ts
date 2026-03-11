import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserStatsService } from './user-stats.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserStatsService],
  exports: [UsersService, UserStatsService],
})
export class UsersModule {}
