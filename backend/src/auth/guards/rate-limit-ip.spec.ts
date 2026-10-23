import { ExecutionContext } from '@nestjs/common';
import { MagicLinkRateLimitGuard } from './magic-link-rate-limit.guard';
import { SignupRateLimitGuard } from './signup-rate-limit.guard';
import { RateLimiterService } from '../../common/services/rate-limiter.service';

describe('trusted client IP for auth limits', () => {
  it.each([MagicLinkRateLimitGuard, SignupRateLimitGuard])(
    '%p ignores spoofed raw forwarded headers',
    async (Guard) => {
      const consume = jest.fn().mockResolvedValue({
        allowed: true,
        remaining: 10,
        totalLimit: 20,
        resetTime: Date.now() + 1000,
      });
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '192.0.2.10',
            headers: { 'x-forwarded-for': 'spoofed' },
            body: {},
          }),
          getResponse: () => ({ setHeader: jest.fn() }),
        }),
      } as unknown as ExecutionContext;
      await new Guard({ consume } as unknown as RateLimiterService).canActivate(
        context,
      );
      expect(consume.mock.calls[0][0]).toContain('192.0.2.10');
      expect(consume.mock.calls[0][0]).not.toContain('spoofed');
    },
  );
});
