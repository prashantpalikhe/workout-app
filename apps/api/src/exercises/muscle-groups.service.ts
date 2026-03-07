import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class MuscleGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.muscleGroup.findMany({
      orderBy: [{ bodyRegion: 'asc' }, { name: 'asc' }],
    });
  }
}
