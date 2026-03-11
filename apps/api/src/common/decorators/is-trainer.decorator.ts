import { SetMetadata } from '@nestjs/common';

export const IS_TRAINER_KEY = 'isTrainer';

/**
 * Decorator that marks a route as requiring trainer access.
 * Used with TrainerGuard to restrict endpoints to users with isTrainer=true.
 */
export const IsTrainer = () => SetMetadata(IS_TRAINER_KEY, true);
