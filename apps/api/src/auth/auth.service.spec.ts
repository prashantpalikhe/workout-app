import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users';
import { PrismaService } from '../prisma';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  verify: vi.fn().mockResolvedValue(true),
  argon2id: 2,
}));

// ── Hoisted mock fns (available inside vi.mock factories) ──
const { mockVerifyIdToken, mockAppleVerify } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockAppleVerify: vi.fn(),
}));

// ── Mock Google OAuth2Client ─────────────────────
vi.mock('google-auth-library', () => ({
  OAuth2Client: class MockOAuth2Client {
    verifyIdToken = mockVerifyIdToken;
  },
}));

// ── Mock Apple Sign-In ───────────────────────────
vi.mock('apple-signin-auth', () => ({
  default: { verifyIdToken: mockAppleVerify },
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let jwtService: { sign: ReturnType<typeof vi.fn> };
  let prisma: {
    refreshToken: {
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let configService: { get: ReturnType<typeof vi.fn> };

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: 'ATHLETE',
    avatarUrl: null,
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    jwtService = { sign: vi.fn().mockReturnValue('mock-access-token') };
    prisma = {
      refreshToken: {
        create: vi.fn().mockResolvedValue({}),
        findFirst: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    configService = { get: vi.fn() };

    // Reset OAuth mocks
    mockVerifyIdToken.mockReset();
    mockAppleVerify.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          role: 'ATHLETE',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return tokens on success', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'ATHLETE',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBeDefined();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'no@user.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user has no password (OAuth user)', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });
      await expect(
        service.login({ email: 'test@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const argon2 = await import('argon2');
      vi.mocked(argon2.verify).mockResolvedValueOnce(false);

      usersService.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.id).toBe('user-uuid');
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBeDefined();
    });
  });

  // ── Google OAuth ─────────────────────────────────
  describe('googleLogin', () => {
    const googleDto = { idToken: 'google-id-token' };
    const googlePayload = {
      email: 'google@example.com',
      email_verified: true,
      given_name: 'Google',
      family_name: 'User',
      picture: 'https://example.com/photo.jpg',
    };

    it('should throw if Google login is not configured', async () => {
      configService.get.mockReturnValue(undefined);
      await expect(service.googleLogin(googleDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw on invalid Google ID token', async () => {
      configService.get.mockReturnValue('google-client-id');
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.googleLogin(googleDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if Google email is not verified', async () => {
      configService.get.mockReturnValue('google-client-id');
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ ...googlePayload, email_verified: false }),
      });

      await expect(service.googleLogin(googleDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should create new user on first Google login', async () => {
      configService.get.mockReturnValue('google-client-id');
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => googlePayload,
      });
      usersService.findByEmail.mockResolvedValue(null);
      const newUser = {
        ...mockUser,
        email: 'google@example.com',
        firstName: 'Google',
        lastName: 'User',
        avatarUrl: 'https://example.com/photo.jpg',
      };
      usersService.create.mockResolvedValue(newUser);

      const result = await service.googleLogin(googleDto);

      expect(usersService.create).toHaveBeenCalledWith({
        email: 'google@example.com',
        firstName: 'Google',
        lastName: 'User',
        role: 'ATHLETE',
        avatarUrl: 'https://example.com/photo.jpg',
      });
      expect(result.user.email).toBe('google@example.com');
      expect(result.tokens.accessToken).toBe('mock-access-token');
    });

    it('should return existing user on subsequent Google login', async () => {
      configService.get.mockReturnValue('google-client-id');
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => googlePayload,
      });
      const existingUser = {
        ...mockUser,
        email: 'google@example.com',
        avatarUrl: 'https://example.com/existing.jpg',
      };
      usersService.findByEmail.mockResolvedValue(existingUser);

      const result = await service.googleLogin(googleDto);

      expect(usersService.create).not.toHaveBeenCalled();
      expect(result.user.email).toBe('google@example.com');
    });

    it('should update avatar if not already set', async () => {
      configService.get.mockReturnValue('google-client-id');
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => googlePayload,
      });
      const existingUser = { ...mockUser, email: 'google@example.com', avatarUrl: null };
      const updatedUser = { ...existingUser, avatarUrl: 'https://example.com/photo.jpg' };
      usersService.findByEmail.mockResolvedValue(existingUser);
      usersService.update.mockResolvedValue(updatedUser);

      await service.googleLogin(googleDto);

      expect(usersService.update).toHaveBeenCalledWith(existingUser.id, {
        avatarUrl: 'https://example.com/photo.jpg',
      });
    });
  });

  // ── Apple OAuth ──────────────────────────────────
  describe('appleLogin', () => {
    const appleDto = { idToken: 'apple-id-token' };
    const applePayload = { email: 'apple@example.com', sub: 'apple-sub-123' };

    it('should throw if Apple login is not configured', async () => {
      configService.get.mockReturnValue(undefined);
      await expect(service.appleLogin(appleDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw on invalid Apple ID token', async () => {
      configService.get.mockReturnValue('apple-client-id');
      mockAppleVerify.mockRejectedValue(new Error('Invalid token'));

      await expect(service.appleLogin(appleDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if Apple account provides no email', async () => {
      configService.get.mockReturnValue('apple-client-id');
      mockAppleVerify.mockResolvedValue({ sub: 'apple-sub-123' });

      await expect(service.appleLogin(appleDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should create new user with name from Apple DTO', async () => {
      configService.get.mockReturnValue('apple-client-id');
      mockAppleVerify.mockResolvedValue(applePayload);
      usersService.findByEmail.mockResolvedValue(null);
      const newUser = {
        ...mockUser,
        email: 'apple@example.com',
        firstName: 'Jane',
        lastName: 'Appleseed',
      };
      usersService.create.mockResolvedValue(newUser);

      const dto = { idToken: 'apple-id-token', firstName: 'Jane', lastName: 'Appleseed' };
      const result = await service.appleLogin(dto);

      expect(usersService.create).toHaveBeenCalledWith({
        email: 'apple@example.com',
        firstName: 'Jane',
        lastName: 'Appleseed',
        role: 'ATHLETE',
        avatarUrl: undefined,
      });
      expect(result.user.email).toBe('apple@example.com');
    });

    it('should use email prefix as firstName fallback when name not provided', async () => {
      configService.get.mockReturnValue('apple-client-id');
      mockAppleVerify.mockResolvedValue(applePayload);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        ...mockUser,
        email: 'apple@example.com',
        firstName: 'apple',
        lastName: '',
      });

      await service.appleLogin(appleDto);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'apple',
          lastName: '',
        }),
      );
    });

    it('should return existing user on subsequent Apple login', async () => {
      configService.get.mockReturnValue('apple-client-id');
      mockAppleVerify.mockResolvedValue(applePayload);
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        email: 'apple@example.com',
      });

      const result = await service.appleLogin(appleDto);

      expect(usersService.create).not.toHaveBeenCalled();
      expect(result.user.email).toBe('apple@example.com');
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if token not found', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(null);
      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should revoke old token and return new pair', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-uuid',
        user: mockUser,
      });

      const result = await service.refresh('valid-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt-uuid' },
          data: { revokedAt: expect.any(Date) },
        }),
      );
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      await service.logout('some-token');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ revokedAt: null }),
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });
  });
});
