import { SetMetadata } from '@nestjs/common';
import type { FeatureKey } from './feature.types';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';
export const RequireFeature = (feature: FeatureKey) => SetMetadata(REQUIRED_FEATURE_KEY, feature);
