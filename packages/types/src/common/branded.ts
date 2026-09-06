/** Ids nominais: impedem passar um TenantId onde se espera um BranchId. */
declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type TenantId = Brand<string, 'TenantId'>;
export type BranchId = Brand<string, 'BranchId'>;
export type UserId = Brand<string, 'UserId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type CustomerId = Brand<string, 'CustomerId'>;
export type SupplierId = Brand<string, 'SupplierId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type RoleId = Brand<string, 'RoleId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type PriceTableId = Brand<string, 'PriceTableId'>;
export type WarehouseId = Brand<string, 'WarehouseId'>;

export const asTenantId = (value: string): TenantId => value as TenantId;
export const asBranchId = (value: string): BranchId => value as BranchId;
export const asUserId = (value: string): UserId => value as UserId;
export const asProductId = (value: string): ProductId => value as ProductId;
export const asCustomerId = (value: string): CustomerId => value as CustomerId;
export const asSupplierId = (value: string): SupplierId => value as SupplierId;
export const asOrderId = (value: string): OrderId => value as OrderId;
export const asRoleId = (value: string): RoleId => value as RoleId;
export const asCategoryId = (value: string): CategoryId => value as CategoryId;
export const asPriceTableId = (value: string): PriceTableId => value as PriceTableId;
export const asWarehouseId = (value: string): WarehouseId => value as WarehouseId;
