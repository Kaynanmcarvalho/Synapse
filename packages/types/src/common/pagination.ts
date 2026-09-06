export interface PageRequest {
  readonly limit: number;
  readonly cursor?: string;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 200;
