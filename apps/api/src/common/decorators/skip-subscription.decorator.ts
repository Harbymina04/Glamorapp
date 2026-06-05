import { SetMetadata } from '@nestjs/common';

export const SKIP_SUBSCRIPTION_KEY = 'skipSubscriptionCheck';

/** Apply to a controller or route handler to bypass the SubscriptionGuard.
 *  Use on billing, auth, public and superadmin-only endpoints. */
export const SkipSubscriptionCheck = () => SetMetadata(SKIP_SUBSCRIPTION_KEY, true);
