import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MuscleGroupsService } from './muscle-groups.service';

@ApiTags('muscle-groups')
@ApiBearerAuth('access-token')
@Controller('muscle-groups')
export class MuscleGroupsController {
  constructor(private readonly muscleGroupsService: MuscleGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List all muscle groups' })
  @ApiOkResponse({ description: 'All muscle groups' })
  async findAll() {
    return this.muscleGroupsService.findAll();
  }
}
