import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { IS_TRAINER_KEY } from '../decorators/is-trainer.decorator';

/**
 * Guard that checks if the current user has isTrainer=true.
 * Apply to controllers/routes with @IsTrainer() decorator or
 * use @UseGuards(TrainerGuard) directly.
 */
@Injectable()
export class TrainerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresTrainer = this.reflector.getAllAndOverride<boolean>(
      IS_TRAINER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresTrainer) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;

    if (!user?.isTrainer) {
      throw new ForbiddenException('This action requires trainer access');
    }

    return true;
  }
}
