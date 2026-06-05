import { UseGuards, applyDecorators } from '@nestjs/common';
import { SubscriptionGuard } from '../guards/subscription.guard';

/** Apply on a controller to enforce active subscription (blocks expired trials). */
export const UseSubscriptionGuard = () => applyDecorators(UseGuards(SubscriptionGuard));
