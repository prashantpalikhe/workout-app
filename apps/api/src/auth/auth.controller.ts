import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  registerInputSchema,
  loginInputSchema,
  refreshTokenInputSchema,
  type RegisterInput,
  type LoginInput,
  type RefreshTokenInput,
} from '@workout/shared';
import { AuthService } from './auth.service';
import { Public, ZodValidationPipe, zodToOpenApi } from '../common';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user with email and password' })
  @ApiBody({ schema: zodToOpenApi(registerInputSchema) })
  @ApiCreatedResponse({ description: 'User created, tokens returned' })
  @ApiConflictResponse({ description: 'Email already registered' })
  async register(
    @Body(new ZodValidationPipe(registerInputSchema)) dto: RegisterInput,
  ) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ schema: zodToOpenApi(loginInputSchema) })
  @ApiOkResponse({ description: 'Login successful, tokens returned' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body(new ZodValidationPipe(loginInputSchema)) dto: LoginInput,
  ) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ schema: zodToOpenApi(refreshTokenInputSchema) })
  @ApiOkResponse({ description: 'New token pair returned' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenInputSchema))
    dto: RefreshTokenInput,
  ) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — revokes the refresh token' })
  @ApiBody({ schema: zodToOpenApi(refreshTokenInputSchema) })
  @ApiOkResponse({ description: 'Logged out successfully' })
  async logout(
    @Body(new ZodValidationPipe(refreshTokenInputSchema))
    dto: RefreshTokenInput,
  ) {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }
}
