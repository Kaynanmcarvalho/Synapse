import { z } from 'zod';

const uf = z.string().regex(/^[A-Z]{2}$/);
export const driverSchema = z.object({
  name: z.string().trim().min(3).max(120),
  cpf: z.string().regex(/^\d{11}$/),
  licenseNumber: z.string().min(3).max(30),
});
export const vehicleSchema = z.object({
  plate: z
    .string()
    .toUpperCase()
    .regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/),
  renavam: z.string().regex(/^\d{9,11}$/),
  capacityKg: z.number().positive(),
  rntrc: z.string().max(20).nullable().optional(),
});
export const issueMdfeSchema = z.object({
  companyId: z.string().min(1),
  referenceId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(120),
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  nfeAccessKeys: z.array(z.string().regex(/^\d{44}$/)).min(1),
  loadingState: uf,
  unloadingState: uf,
  routeStates: z.array(uf).default([]),
  cargoValueCents: z.number().int().nonnegative(),
  cargoWeightKg: z.number().positive(),
});
export const mdfeEventSchema = z.object({
  justification: z.string().trim().min(15).max(255),
  cityCode: z
    .string()
    .regex(/^\d{7}$/)
    .optional(),
});
export type DriverInput = z.infer<typeof driverSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type IssueMdfeInput = z.infer<typeof issueMdfeSchema>;
export type MdfeEventInput = z.infer<typeof mdfeEventSchema>;
