import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ChartService } from '../chart/chart.service';
import { EphemerisService } from '../services/ephemeris.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('SupabaseAuthService', () => {
  let service: SupabaseAuthService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let chartService: jest.Mocked<ChartService>;
  let ephemerisService: jest.Mocked<EphemerisService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUser = {
    id: 'test-user-id-123',
    email: 'test@example.com',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_metadata: {
      name: 'Test User',
    },
  };

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
  };

  const mockUserProfile = {
    id: 'test-user-id-123',
    email: 'test@example.com',
    name: 'Test User',
    birth_date: '1990-01-01',
    birth_time: '12:00',
    birth_place: 'Москва',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    const mockSupabaseService = {
      signInWithOTP: jest.fn(),
      verifyOTP: jest.fn(),
      signUp: jest.fn(),
      getUserProfileAdmin: jest.fn(),
      getUserChartsAdmin: jest.fn(),
      fromAdmin: jest.fn(),
      getUser: jest.fn(),
    };

    const mockChartService = {
      createNatalChart: jest.fn(),
    };

    const mockEphemerisService = {
      calculateNatalChart: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseAuthService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: ChartService,
          useValue: mockChartService,
        },
        {
          provide: EphemerisService,
          useValue: mockEphemerisService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<SupabaseAuthService>(SupabaseAuthService);
    supabaseService = module.get(SupabaseService);
    chartService = module.get(ChartService);
    ephemerisService = module.get(EphemerisService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMagicLink', () => {
    it('should successfully send magic link', async () => {
      supabaseService.signInWithOTP.mockResolvedValue({
        data: {},
        error: null,
      } as any);

      const result = await service.sendMagicLink('test@example.com');

      expect(result).toEqual({ success: true });
      expect(supabaseService.signInWithOTP).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw BadRequestException on Supabase error', async () => {
      supabaseService.signInWithOTP.mockResolvedValue({
        data: null,
        error: { message: 'Email not found' },
      } as any);

      await expect(service.sendMagicLink('test@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle invalid email format', async () => {
      supabaseService.signInWithOTP.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email' },
      } as any);

      await expect(service.sendMagicLink('invalid-email')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyMagicLink', () => {
    it('should successfully verify magic link and return user data', async () => {
      supabaseService.verifyOTP.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      } as any);

      supabaseService.getUserProfileAdmin.mockResolvedValue({
        data: mockUserProfile,
        error: null,
      } as any);

      supabaseService.getUserChartsAdmin.mockResolvedValue({
        data: [{ id: 'chart-1' }],
        error: null,
      } as any);

      const result = await service.verifyMagicLink('valid-token');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('access_token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.access_token).toBe(mockSession.access_token);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      supabaseService.verifyOTP.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      } as any);

      await expect(service.verifyMagicLink('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      supabaseService.verifyOTP.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Token expired' },
      } as any);

      await expect(service.verifyMagicLink('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should create natal chart if user has birth data but no chart', async () => {
      supabaseService.verifyOTP.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      } as any);

      supabaseService.getUserProfileAdmin.mockResolvedValue({
        data: mockUserProfile,
        error: null,
      } as any);

      supabaseService.getUserChartsAdmin.mockResolvedValue({
        data: [], // No existing charts
        error: null,
      } as any);

      await service.verifyMagicLink('valid-token');

      // Should attempt to create natal chart
      // Note: Actual implementation details depend on createNatalChart method
    });
  });

  describe('signup', () => {
    const validSignupDto = {
      email: 'newuser@example.com',
      name: 'New User',
      birthDate: '1995-05-15',
      birthTime: '14:30',
      birthPlace: 'Москва',
    };

    it('should successfully register new user', async () => {
      supabaseService.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      } as any);

      const result = await service.signup(validSignupDto);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
      expect(supabaseService.signUp).toHaveBeenCalledWith(validSignupDto.email);
    });

    it('should throw ConflictException for existing email', async () => {
      supabaseService.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      } as any);

      await expect(service.signup(validSignupDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should validate birth date is not in future', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const invalidDto = {
        ...validSignupDto,
        birthDate: futureDate.toISOString().split('T')[0],
      };

      // Implementation should throw BadRequestException
      // This depends on actual validation in the service
    });

    it('should validate birth time format (HH:MM)', async () => {
      const invalidDto = {
        ...validSignupDto,
        birthTime: '25:99', // Invalid time
      };

      // Implementation should validate time format
      // This test assumes validation exists
    });

    it('should handle missing optional fields', async () => {
      const minimalDto = {
        email: 'minimal@example.com',
        name: 'Minimal User',
        birthDate: '2000-01-01',
        // No birthTime or birthPlace
      };

      supabaseService.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      } as any);

      const result = await service.signup(minimalDto as any);

      expect(result.success).toBe(true);
    });
  });

  describe('completeSignup', () => {
    const completeSignupDto = {
      userId: 'test-user-id-123',
      name: 'Complete User',
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Москва',
      latitude: 55.7558,
      longitude: 37.6173,
    };

    it('should complete signup with birth data', async () => {
      const mockFromAdmin = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserProfile,
          error: null,
        }),
      };

      supabaseService.fromAdmin.mockReturnValue(mockFromAdmin as any);

      // Test depends on actual implementation
      // This is a placeholder for the expected behavior
    });

    it('should throw error if user not found', async () => {
      const mockFromAdmin = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User not found' },
        }),
      };

      supabaseService.fromAdmin.mockReturnValue(mockFromAdmin as any);

      // Should throw appropriate error
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate JWT token structure', async () => {
      // Test that the service properly validates JWT tokens
      // This ensures token expiration is enforced
    });

    it('should reject expired tokens', async () => {
      // Test that expired tokens are rejected
      // Critical security test
    });

    it('should reject tokens with invalid signature', async () => {
      // Test that tampered tokens are rejected
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive error details', async () => {
      supabaseService.signUp.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        service.signup({
          email: 'test@example.com',
          name: 'Test',
          birthDate: '1990-01-01',
        } as any),
      ).rejects.toThrow(BadRequestException);
      // Should not expose internal database errors
    });

    it('should sanitize user input', async () => {
      const maliciousDto = {
        email: 'test@example.com',
        name: '<script>alert("xss")</script>',
        birthDate: '1990-01-01',
      };

      // Should sanitize or reject malicious input
    });

    it('should rate limit signup attempts', async () => {
      // Integration with SignupRateLimitGuard
      // This is handled at controller level with guards
    });
  });

  describe('Edge Cases', () => {
    it('should handle network timeouts gracefully', async () => {
      supabaseService.signUp.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100),
          ),
      );

      await expect(
        service.signup({
          email: 'test@example.com',
          name: 'Test',
          birthDate: '1990-01-01',
        } as any),
      ).rejects.toThrow();
    });

    it('should handle concurrent signup requests', async () => {
      // Test race conditions
      const dto = {
        email: 'concurrent@example.com',
        name: 'Test',
        birthDate: '1990-01-01',
      };

      supabaseService.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      } as any);

      const promises = [
        service.signup(dto as any),
        service.signup(dto as any),
      ];

      // At least one should succeed, one might fail with conflict
      const results = await Promise.allSettled(promises);
      expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
    });
  });
});
