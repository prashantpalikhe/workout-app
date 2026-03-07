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
  googleOAuthInputSchema,
  appleOAuthInputSchema,
  type RegisterInput,
  type LoginInput,
  type RefreshTokenInput,
  type GoogleOAuthInput,
  type AppleOAuthInput,
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

  @Public()
  @Post('oauth/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with Google ID token' })
  @ApiBody({ schema: zodToOpenApi(googleOAuthInputSchema) })
  @ApiOkResponse({ description: 'Login successful, tokens returned' })
  @ApiUnauthorizedResponse({ description: 'Invalid Google ID token' })
  async googleLogin(
    @Body(new ZodValidationPipe(googleOAuthInputSchema)) dto: GoogleOAuthInput,
  ) {
    return this.authService.googleLogin(dto);
  }

  @Public()
  @Post('oauth/apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with Apple ID token' })
  @ApiBody({ schema: zodToOpenApi(appleOAuthInputSchema) })
  @ApiOkResponse({ description: 'Login successful, tokens returned' })
  @ApiUnauthorizedResponse({ description: 'Invalid Apple ID token' })
  async appleLogin(
    @Body(new ZodValidationPipe(appleOAuthInputSchema)) dto: AppleOAuthInput,
  ) {
    return this.authService.appleLogin(dto);
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
