import { z } from 'zod';
import { PERMISSIONS } from '@synapse/types';

const permissionEnum = z.enum(PERMISSIONS as unknown as [string, ...string[]]);

export const permissionGrantSchema = z.object({
  permission: permissionEnum,
  scope: z
    .object({
      branchIds: z.array(z.string().trim().min(1)).optional(),
      warehouseIds: z.array(z.string().trim().min(1)).optional(),
    })
    .optional(),
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  permissions: z.array(permissionGrantSchema).min(1, 'O cargo precisa de ao menos uma permissao'),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = createRoleSchema.partial();

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
