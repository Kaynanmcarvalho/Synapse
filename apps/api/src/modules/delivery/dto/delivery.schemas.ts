import { z } from 'zod';
const item = z.object({ productId: z.string().min(1), quantity: z.number().int().positive() });
export const createRouteSchema = z.object({
  name: z.string().min(3),
  branchId: z.string().min(1),
  warehouseId: z.string().min(1),
  ownFleet: z.boolean(),
  mdfeId: z.string().nullable().optional(),
  deliveries: z
    .array(
      z.object({
        orderId: z.string().min(1),
        address: z.string().min(5),
        items: z.array(item).min(1),
      }),
    )
    .min(1),
});
export const assignmentSchema = z.object({
  driverId: z.string().min(1),
  vehicleId: z.string().min(1),
});
export const pickingSchema = z.object({ checkedProductIds: z.array(z.string().min(1)).min(1) });
export const proofSchema = z
  .object({
    signatureUrl: z.string().url().nullable().optional(),
    photoUrl: z.string().url().nullable().optional(),
  })
  .refine((v) => v.signatureUrl || v.photoUrl, { message: 'Assinatura ou foto obrigatória' });
export const failureSchema = z.object({
  reason: z.string().trim().min(10),
  disposition: z.enum(['RETURN_STOCK', 'RETAIN_DRIVER']),
});
export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type PickingInput = z.infer<typeof pickingSchema>;
export type ProofInput = z.infer<typeof proofSchema>;
export type FailureInput = z.infer<typeof failureSchema>;
