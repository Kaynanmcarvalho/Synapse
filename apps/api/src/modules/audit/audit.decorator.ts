import { SetMetadata } from '@nestjs/common';
import type { AuditedDomain } from '@synapse/types';

export const AUDIT_METADATA = 'audit:mutation';
export interface AuditMetadata {
  readonly domain: AuditedDomain;
  readonly entity: string;
  readonly collection: string;
}
export const AuditedMutation = (metadata: AuditMetadata) => SetMetadata(AUDIT_METADATA, metadata);
