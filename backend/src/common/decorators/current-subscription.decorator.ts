import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Декоратор для получения текущей подписки в контроллере
 * @example
 * @Get('some-endpoint')
 * async handler(@CurrentSubscription() subscription: SubscriptionStatusResponse) {
 *   console.log(subscription.tier);
 * }
 */
export const CurrentSubscription = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.subscription;
  },
);
