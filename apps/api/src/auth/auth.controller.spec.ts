import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Record<string, ReturnType<typeof vi.fn>>;

  const mockAuthResponse = {
    user: {
      id: 'uuid',
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
      isTrainer: false,
      avatarUrl: null,
      hasPassword: true,
      settings: {
        theme: 'SYSTEM',
        unitPreference: 'METRIC',
        restTimerEnabled: true,
        defaultRestSec: 90,
      },
    },
    tokens: { accessToken: 'at', refreshToken: 'rt' },
  };

  beforeEach(async () => {
    authService = {
      register: vi.fn().mockResolvedValue(mockAuthResponse),
      login: vi.fn().mockResolvedValue(mockAuthResponse),
      googleLogin: vi.fn().mockResolvedValue(mockAuthResponse),
      appleLogin: vi.fn().mockResolvedValue(mockAuthResponse),
      refresh: vi.fn().mockResolvedValue(mockAuthResponse),
      logout: vi.fn().mockResolvedValue(undefined),
      changePassword: vi.fn().mockResolvedValue(undefined),
      setPassword: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('register should call authService.register and return response', async () => {
    const dto = {
      email: 'a@b.com',
      password: '12345678',
      firstName: 'A',
      lastName: 'B',
    };
    const result = await controller.register(dto);
    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(result.tokens.accessToken).toBe('at');
  });

  it('login should call authService.login', async () => {
    const dto = { email: 'a@b.com', password: '12345678' };
    await controller.login(dto);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('googleLogin should call authService.googleLogin', async () => {
    const dto = { idToken: 'google-token' };
    const result = await controller.googleLogin(dto);
    expect(authService.googleLogin).toHaveBeenCalledWith(dto);
    expect(result.tokens.accessToken).toBe('at');
  });

  it('appleLogin should call authService.appleLogin', async () => {
    const dto = { idToken: 'apple-token', firstName: 'A', lastName: 'B' };
    const result = await controller.appleLogin(dto);
    expect(authService.appleLogin).toHaveBeenCalledWith(dto);
    expect(result.tokens.accessToken).toBe('at');
  });

  it('refresh should call authService.refresh with token string', async () => {
    await controller.refresh({ refreshToken: 'rt' });
    expect(authService.refresh).toHaveBeenCalledWith('rt');
  });

  it('logout should call authService.logout and return message', async () => {
    const result = await controller.logout({ refreshToken: 'rt' });
    expect(authService.logout).toHaveBeenCalledWith('rt');
    expect(result).toEqual({ message: 'Logged out successfully' });
  });

  it('changePassword should call authService.changePassword and return message', async () => {
    const dto = { currentPassword: 'old12345', newPassword: 'new12345678' };
    const result = await controller.changePassword('uid', dto);
    expect(authService.changePassword).toHaveBeenCalledWith(
      'uid',
      'old12345',
      'new12345678',
    );
    expect(result).toEqual({ message: 'Password changed successfully' });
  });

  it('setPassword should call authService.setPassword and return message', async () => {
    const dto = { password: 'new12345678' };
    const result = await controller.setPassword('uid', dto);
    expect(authService.setPassword).toHaveBeenCalledWith('uid', 'new12345678');
    expect(result).toEqual({ message: 'Password set successfully' });
  });
});
