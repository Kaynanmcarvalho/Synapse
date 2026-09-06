import { apiRequest } from '../../lib/dev-auth';

export type SearchEntityType =
  'customer' | 'supplier' | 'product' | 'order' | 'fiscalDocument' | 'titulo' | 'seller';

export interface SearchResultItem {
  readonly type: SearchEntityType;
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly path: string;
}

export interface GlobalSearchResult {
  readonly items: readonly SearchResultItem[];
  readonly unavailable: readonly string[];
}

export const globalSearch = (q: string, limit = 8): Promise<GlobalSearchResult> =>
  apiRequest(`/search?q=${encodeURIComponent(q)}&limit=${limit}`);

export interface SavedFilter {
  readonly id: string;
  readonly screen: string;
  readonly name: string;
  readonly filterState: Record<string, unknown>;
  readonly createdAt: string;
}

export const listSavedFilters = (screen: string): Promise<SavedFilter[]> =>
  apiRequest(`/search/saved-filters?screen=${encodeURIComponent(screen)}`);

export const createSavedFilter = (
  screen: string,
  name: string,
  filterState: Record<string, unknown>,
): Promise<SavedFilter> =>
  apiRequest('/search/saved-filters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ screen, name, filterState }),
  });

export const deleteSavedFilter = (id: string): Promise<{ deleted: boolean }> =>
  apiRequest(`/search/saved-filters/${id}`, { method: 'DELETE' });
