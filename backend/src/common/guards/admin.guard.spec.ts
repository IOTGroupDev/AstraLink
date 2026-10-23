/* eslint-disable @typescript-eslint/unbound-method -- Handler references are inspected for Nest metadata, not invoked. */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminGuard } from './admin.guard';
import { ChartController } from '@/chart/chart.controller';
import { DatingController } from '@/dating/dating.controller';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth.guard';
import { SupabaseService } from '@/supabase/supabase.service';
import { Reflector } from '@nestjs/core';
import { AnalyticsController } from '@/analytics/analytics.controller';

function contextFor(user?: {
  role?: string;
  appMetadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('protects every analytics route with the administrator guard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AnalyticsController)).toContain(
      AdminGuard,
    );
  });

  it.each([
    undefined,
    { role: 'authenticated' },
    { role: 'admin' },
    { role: 'authenticated', user_metadata: { role: 'admin' } },
    { appMetadata: { role: 'user' } },
  ])('rejects callers without a server-managed admin role: %j', (user) => {
    expect(() => guard.canActivate(contextFor(user))).toThrow(
      ForbiddenException,
    );
  });

  it('allows the role verified in Supabase app_metadata', () => {
    expect(
      guard.canActivate(contextFor({ appMetadata: { role: 'admin' } })),
    ).toBe(true);
  });

  it.each([
    ChartController.prototype.fixNestedChartData,
    DatingController.prototype.runRankCandidates,
  ])('protects the administrative route handler', (handler) => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, handler);
    expect(guards).toContain(AdminGuard);
  });

  it.each(['user', 'admin'])(
    'uses verified app metadata instead of a forged request role: %s',
    async (verifiedRole) => {
      const request = {
        method: 'POST',
        path: '/chart/admin/fix-nested-data',
        headers: { authorization: 'Bearer valid-token' },
        user: { role: 'admin', appMetadata: { role: 'admin' } },
      };
      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => ChartController.prototype.fixNestedChartData,
        getClass: () => ChartController,
      } as unknown as ExecutionContext;
      const authGuard = new SupabaseAuthGuard(
        {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'verified-user',
                role: 'authenticated',
                app_metadata: { role: verifiedRole },
                user_metadata: { role: 'admin' },
              },
            },
            error: null,
          }),
        } as unknown as SupabaseService,
        new Reflector(),
      );
      await expect(authGuard.canActivate(context)).resolves.toBe(true);
      expect(request.user.appMetadata.role).toBe(verifiedRole);
      if (verifiedRole === 'admin') {
        expect(guard.canActivate(context)).toBe(true);
      } else {
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      }
    },
  );
});
