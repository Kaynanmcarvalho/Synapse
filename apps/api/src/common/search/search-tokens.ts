export const searchTerms = (text: string): string[] => [
  ...new Set(
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  ),
];

export function searchTokens(text: string): string[] {
  return [
    ...new Set(
      searchTerms(text).flatMap((word) =>
        Array.from({ length: Math.min(word.length, 64) }, (_, index) => word.slice(0, index + 1)),
      ),
    ),
  ];
}
