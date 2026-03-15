import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma';
import { CurrentUser } from '../common';

@ApiTags('assignments')
@ApiBearerAuth('access-token')
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List programs assigned to the current athlete' })
  @ApiOkResponse({ description: 'List of active assignments' })
  async list(@CurrentUser('sub') userId: string) {
    return this.prisma.programAssignment.findMany({
      where: { athleteId: userId, status: 'ACTIVE' },
      include: {
        program: { select: { id: true, name: true, description: true } },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }
}
