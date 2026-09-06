import { BadRequestException } from '@nestjs/common';
import type { Page } from '@synapse/types';

export function cursorPage<T extends { readonly id: string }>(
  ordered: readonly T[],
  limit: number,
  cursor?: string,
): Page<T> {
  const cursorIndex = cursor ? ordered.findIndex((item) => item.id === cursor) : -1;
  if (cursor && cursorIndex < 0) throw new BadRequestException('Cursor inválido ou expirado');
  const items = ordered.slice(cursorIndex + 1, cursorIndex + 1 + limit);
  const hasMore = cursorIndex + 1 + items.length < ordered.length;
  return { items, hasMore, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
}
