import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Extracts the authenticated user from the request object.
 * Passport attaches the validated JWT payload to `request.user`
 * after verification via the JwtStrategy.
 *
 * Usage:
 *   @Get('me')
 *   getMe(@CurrentUser() user: JwtPayload) { ... }
 *
 *   @Get('me')
 *   getMe(@CurrentUser('sub') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;
    return data ? (user as Record<string, unknown>)?.[data] : user;
  },
);
