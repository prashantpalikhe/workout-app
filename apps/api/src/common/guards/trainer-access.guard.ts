import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';

/**
 * Guard that verifies the current user (trainer) has an ACTIVE relationship
 * with the athlete specified by :athleteId in the route params.
 *
 * Usage: @UseGuards(TrainerAccessGuard) on routes that access athlete data.
 * Requires :athleteId route parameter.
 */
@Injectable()
export class TrainerAccessGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const trainerId = request.user?.sub;
    const athleteId = request.params?.athleteId;

    if (!trainerId || !athleteId) {
      throw new ForbiddenException('Missing trainer or athlete identifier');
    }

    // Verify trainer has isTrainer flag
    if (!request.user?.isTrainer) {
      throw new ForbiddenException('This action requires trainer access');
    }

    // Verify ACTIVE relationship exists
    const relationship = await this.prisma.trainerAthlete.findUnique({
      where: {
        trainerId_athleteId: { trainerId, athleteId },
      },
    });

    if (!relationship || relationship.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'You do not have an active trainer relationship with this athlete',
      );
    }

    return true;
  }
}
