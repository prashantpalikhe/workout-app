import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma';
import { UsersService } from '../users';
import { MailService } from '../mail';
import type { JwtPayload } from './interfaces';
import type { Env } from '../config';
import type {
  RegisterInput,
  LoginInput,
  GoogleOAuthInput,
  AppleOAuthInput,
} from '@workout/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private static readonly RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly RESET_TOKEN_RATE_LIMIT = 3; // max per hour

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly mailService: MailService,
  ) {}

  // ── Register ────────────────────────────────
  async register(dto: RegisterInput) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.isTrainer,
    );
    this.logger.log(`User registered: ${user.email}`);

    return this.buildAuthResponse(user.id, tokens);
  }

  // ── Login ───────────────────────────────────
  async login(dto: LoginInput) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.isTrainer,
    );
    this.logger.log(`User logged in: ${user.email}`);

    return this.buildAuthResponse(user.id, tokens);
  }

  // ── Google OAuth ──────────────────────────────
  async googleLogin(dto: GoogleOAuthInput) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true });
    if (!clientId) {
      throw new UnauthorizedException('Google login is not configured');
    }

    const client = new OAuth2Client(clientId);

    let payload: TokenPayload | undefined;
    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('Google account email not verified');
    }

    const user = await this.findOrCreateOAuthUser({
      email: payload.email,
      firstName: payload.given_name || payload.email.split('@')[0],
      lastName: payload.family_name || '',
      avatarUrl: payload.picture,
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.isTrainer,
    );
    this.logger.log(`User logged in via Google: ${user.email}`);

    return this.buildAuthResponse(user.id, tokens);
  }

  // ── Apple OAuth ───────────────────────────────
  async appleLogin(dto: AppleOAuthInput) {
    const clientId = this.config.get('APPLE_CLIENT_ID', { infer: true });
    if (!clientId) {
      throw new UnauthorizedException('Apple login is not configured');
    }

    let payload: { email?: string; sub?: string };
    try {
      payload = await appleSignin.verifyIdToken(dto.idToken, {
        audience: clientId,
        ignoreExpiration: false,
      });
    } catch {
      throw new UnauthorizedException('Invalid Apple ID token');
    }

    if (!payload.email) {
      throw new UnauthorizedException('Apple account did not provide email');
    }

    // Apple only sends the name on the FIRST authorization.
    // The DTO may contain firstName/lastName from the frontend.
    const user = await this.findOrCreateOAuthUser({
      email: payload.email,
      firstName: dto.firstName || payload.email.split('@')[0],
      lastName: dto.lastName || '',
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.isTrainer,
    );
    this.logger.log(`User logged in via Apple: ${user.email}`);

    return this.buildAuthResponse(user.id, tokens);
  }

  // ── Refresh ─────────────────────────────────
  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const { user } = stored;
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.isTrainer,
    );

    return this.buildAuthResponse(user.id, tokens);
  }

  // ── Logout ──────────────────────────────────
  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ── Forgot Password ───────────────────────────
  async forgotPassword(email: string) {
    // Always return the same response to prevent user enumeration
    const user = await this.usersService.findByEmail(email);
    if (!user) return;

    // Rate limit: max 3 tokens per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gt: oneHourAgo } },
    });
    if (recentCount >= AuthService.RESET_TOKEN_RATE_LIMIT) {
      this.logger.warn(`Password reset rate limit hit for ${email}`);
      return; // Silent — don't reveal rate limiting to caller
    }

    // Invalidate any existing unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate token: 32 random bytes → hex string, store SHA-256 hash
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + AuthService.RESET_TOKEN_EXPIRY_MS);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // Send email (fire-and-forget — don't let email failures block the response)
    this.mailService
      .sendPasswordReset(user.email, user.firstName, rawToken)
      .catch((err) => {
        this.logger.error(`Failed to send reset email to ${email}: ${err}`);
      });
  }

  // ── Reset Password ──────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);

    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Hash new password and update user
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.$transaction([
      // Update password
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      // Mark token as used
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens (force re-login everywhere)
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password reset successful for ${stored.user.email}`);
  }

  // ── Change Password ─────────────────────────
  // User knows their current password and wants to change it.
  // Revokes all refresh tokens so other sessions are forced to re-login.
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.passwordHash) {
      throw new BadRequestException('No password is set for this account');
    }

    const isValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password changed for user: ${user.email}`);
  }

  // ── Set Password ────────────────────────────
  // For OAuth-only users who want to also log in with email+password.
  // Rejects if a password is already set (use changePassword instead).
  async setPassword(userId: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.passwordHash) {
      throw new BadRequestException(
        'A password is already set. Use change password instead.',
      );
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    this.logger.log(`Password set for OAuth user: ${user.email}`);
  }

  // ── Private Helpers ───────────────────────────

  /**
   * Find an existing user by email, or create a new one (without password).
   * Used by Google and Apple OAuth flows.
   */
  private async findOrCreateOAuthUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }) {
    const existing = await this.usersService.findByEmail(data.email);

    if (existing) {
      // Update avatar if provided and not already set
      if (data.avatarUrl && !existing.avatarUrl) {
        return this.usersService.update(existing.id, {
          avatarUrl: data.avatarUrl,
        });
      }
      return existing;
    }

    try {
      return await this.usersService.create({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        avatarUrl: data.avatarUrl,
      });
    } catch (error) {
      // Handle race condition: another request created this user concurrently.
      // Prisma wraps unique-constraint violations in a known error with
      // `code === 'P2002'`.
      if (
        error instanceof Error &&
        (error as { code?: unknown }).code === 'P2002'
      ) {
        const user = await this.usersService.findByEmail(data.email);
        if (user) return user;
      }
      throw error;
    }
  }

  private async buildAuthResponse(
    userId: string,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const user = await this.usersService.findMeById(userId);
    return { user, tokens };
  }

  private async generateTokens(
    userId: string,
    email: string,
    isTrainer: boolean,
  ) {
    const payload: JwtPayload = { sub: userId, email, isTrainer };

    // Access token: short-lived JWT signed with JWT_SECRET
    const accessToken = this.jwtService.sign(payload);

    // Refresh token: opaque random string, stored as SHA-256 hash in DB
    const refreshToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  /**
   * SHA-256 hash for refresh token storage.
   * Refresh tokens are 256-bit random values — brute-force is infeasible,
   * so SHA-256 is appropriate here (argon2 would add unnecessary latency).
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
