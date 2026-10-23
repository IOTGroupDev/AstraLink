import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseService } from '@/supabase/supabase.service';

describe('request-scoped Supabase verification reuse', () => {
  const getUser = jest.fn().mockResolvedValue({
    data: { user: { id: 'verified', app_metadata: {} } },
    error: null,
  });
  const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
  const guard = () =>
    new SupabaseAuthGuard({ getUser } as unknown as SupabaseService, reflector);
  const context = (request: object) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => null,
      getClass: () => null,
    }) as unknown as ExecutionContext;
  beforeEach(() => jest.clearAllMocks());

  it('shares a verification only for the same HTTP request across guard instances', async () => {
    const request = {
      method: 'GET',
      path: '/protected',
      headers: { authorization: 'Bearer token' },
    };
    await guard().canActivate(context(request));
    await guard().canActivate(context(request));
    expect(getUser).toHaveBeenCalledTimes(1);
    await guard().canActivate(context({ ...request }));
    expect(getUser).toHaveBeenCalledTimes(2);
  });
  it('does not trust a forged user field or reuse a changed token', async () => {
    const request = {
      method: 'GET',
      path: '/protected',
      headers: { authorization: 'Bearer first' },
      user: { id: 'forged' },
    };
    await guard().canActivate(context(request));
    expect(request.user.id).toBe('verified');
    request.headers.authorization = 'Bearer second';
    await guard().canActivate(context(request));
    expect(getUser).toHaveBeenCalledTimes(2);
  });
});
