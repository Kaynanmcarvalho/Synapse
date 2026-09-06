import { cursorPage } from './cursor-page';

describe('cursorPage', () => {
  it('percorre a lista sem repetir nem carregar tudo na resposta', () => {
    const values = Array.from({ length: 105 }, (_, index) => ({ id: String(index) }));
    const first = cursorPage(values, 50);
    const second = cursorPage(values, 50, first.nextCursor ?? undefined);
    const third = cursorPage(values, 50, second.nextCursor ?? undefined);
    expect([first.items.length, second.items.length, third.items.length]).toEqual([50, 50, 5]);
    expect(
      new Set([...first.items, ...second.items, ...third.items].map((item) => item.id)).size,
    ).toBe(105);
    expect(third).toMatchObject({ hasMore: false, nextCursor: null });
  });
});
