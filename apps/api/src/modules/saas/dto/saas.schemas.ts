import { z } from 'zod';
import { BILLABLE_RESOURCES, PLAN_CODES } from '../saas.types';

const limits = z
  .object({
    users: z.number().int().positive().optional(),
    branches: z.number().int().positive().optional(),
    products: z.number().int().positive().optional(),
    fiscalDocuments: z.number().int().positive().optional(),
    storageMb: z.number().int().positive().optional(),
    sellers: z.number().int().positive().optional(),
  })
  .optional();

export const createTenantSubscriptionSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(2),
  document: z.string().trim().min(11),
  plan: z.enum(PLAN_CODES),
  limits,
});
export const updateTenantSubscriptionSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    plan: z.enum(PLAN_CODES).optional(),
    status: z.enum(['active', 'suspended']).optional(),
    limits,
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Informe ao menos uma alteração' });
export const consumeResourceSchema = z.object({
  resource: z.enum(BILLABLE_RESOURCES),
  delta: z.number().int(),
});

export type CreateTenantSubscriptionInput = z.infer<typeof createTenantSubscriptionSchema>;
export type UpdateTenantSubscriptionInput = z.infer<typeof updateTenantSubscriptionSchema>;
export type ConsumeResourceInput = z.infer<typeof consumeResourceSchema>;
