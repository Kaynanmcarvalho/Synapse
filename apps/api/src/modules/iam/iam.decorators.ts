import { SetMetadata } from '@nestjs/common';

export const SKIP_APP_CHECK_KEY = 'skipAppCheck';
export const SKIP_TENANT_KEY = 'skipTenant';
export const SKIP_DEVICE_SESSION_KEY = 'skipDeviceSession';

export const SkipAppCheck = () => SetMetadata(SKIP_APP_CHECK_KEY, true);
export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true);
export const SkipDeviceSession = () => SetMetadata(SKIP_DEVICE_SESSION_KEY, true);
