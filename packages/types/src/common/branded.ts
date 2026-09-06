/** Ids nominais: impedem passar um TenantId onde se espera um BranchId. */
declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type TenantId = Brand<string, 'TenantId'>;
export type BranchId = Brand<string, 'BranchId'>;
export type UserId = Brand<string, 'UserId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type CustomerId = Brand<string, 'CustomerId'>;
export type OrderId = Brand<string, 'OrderId'>;

export const asTenantId = (value: string): TenantId => value as TenantId;
export const asBranchId = (value: string): BranchId => value as BranchId;
export const asUserId = (value: string): UserId => value as UserId;
export const asProductId = (value: string): ProductId => value as ProductId;
export const asCustomerId = (value: string): CustomerId => value as CustomerId;
export const asOrderId = (value: string): OrderId => value as OrderId;
