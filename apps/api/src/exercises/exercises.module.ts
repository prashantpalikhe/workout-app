import { Module } from '@nestjs/common';
import { ExercisesController } from './exercises.controller';
import { MuscleGroupsController } from './muscle-groups.controller';
import { ExercisesService } from './exercises.service';
import { MuscleGroupsService } from './muscle-groups.service';

@Module({
  controllers: [ExercisesController, MuscleGroupsController],
  providers: [ExercisesService, MuscleGroupsService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
