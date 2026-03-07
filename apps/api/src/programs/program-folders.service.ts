import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { CreateProgramFolderInput } from '@workout/shared';
import { PrismaService } from '../prisma';

@Injectable()
export class ProgramFoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.programFolder.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string) {
    const folder = await this.prisma.programFolder.findUnique({
      where: { id },
    });

    if (!folder) {
      throw new NotFoundException(`Program folder with id "${id}" not found`);
    }

    return folder;
  }

  async create(userId: string, dto: CreateProgramFolderInput) {
    return this.prisma.programFolder.create({
      data: { ...dto, userId },
    });
  }

  async update(
    userId: string,
    id: string,
    dto: Partial<CreateProgramFolderInput>,
  ) {
    const folder = await this.findById(id);
    this.assertOwnership(folder, userId);

    return this.prisma.programFolder.update({
      where: { id },
      data: dto,
    });
  }

  async delete(userId: string, id: string) {
    const folder = await this.findById(id);
    this.assertOwnership(folder, userId);

    await this.prisma.programFolder.delete({ where: { id } });
  }

  private assertOwnership(folder: { userId: string }, userId: string) {
    if (folder.userId !== userId) {
      throw new ForbiddenException(
        'You can only modify your own program folders',
      );
    }
  }
}
