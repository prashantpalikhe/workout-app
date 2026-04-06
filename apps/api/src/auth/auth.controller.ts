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
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  changePasswordInputSchema,
  setPasswordInputSchema,
  type RegisterInput,
  type LoginInput,
  type RefreshTokenInput,
  type GoogleOAuthInput,
  type AppleOAuthInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type ChangePasswordInput,
  type SetPasswordInput,
} from '@workout/shared';
import { AuthService } from './auth.service';
import {
  CurrentUser,
  Public,
  ZodValidationPipe,
  zodToOpenApi,
} from '../common';

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
  async login(@Body(new ZodValidationPipe(loginInputSchema)) dto: LoginInput) {
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

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({ schema: zodToOpenApi(forgotPasswordInputSchema) })
  @ApiOkResponse({
    description: 'If the email exists, a reset link has been sent',
  })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordInputSchema))
    dto: ForgotPasswordInput,
  ) {
    await this.authService.forgotPassword(dto.email);
    // Always return the same response to prevent user enumeration
    return {
      message:
        'If an account with that email exists, a reset link has been sent',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiBody({ schema: zodToOpenApi(resetPasswordInputSchema) })
  @ApiOkResponse({ description: 'Password has been reset' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired reset token' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordInputSchema))
    dto: ResetPasswordInput,
  ) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Password has been reset successfully' };
  }

  @ApiBearerAuth('access-token')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiBody({ schema: zodToOpenApi(changePasswordInputSchema) })
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiUnauthorizedResponse({ description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(changePasswordInputSchema))
    dto: ChangePasswordInput,
  ) {
    await this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @ApiBearerAuth('access-token')
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a password for the first time (OAuth-only users)',
  })
  @ApiBody({ schema: zodToOpenApi(setPasswordInputSchema) })
  @ApiOkResponse({ description: 'Password set successfully' })
  async setPassword(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(setPasswordInputSchema)) dto: SetPasswordInput,
  ) {
    await this.authService.setPassword(userId, dto.password);
    return { message: 'Password set successfully' };
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
