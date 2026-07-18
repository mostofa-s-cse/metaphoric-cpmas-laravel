import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface UseResourceListOptions {
  listKey: string;
  totalKey?: string;
  initialLimit?: number;
  searchDelay?: number;
  /** Extra query params (e.g. active filter dropdowns). Re-fetches when contents change. */
  filters?: Record<string, any>;
}

/**
 * Centralizes the fetch + pagination + search-debounce + loading/error state
 * duplicated across every Dashboard list page (Suppliers, Vendor, Materials, ...).
 * Also owns `refetch`, so CRUD handlers and useCrudMutations share one source of truth
 * instead of each page reimplementing its own fetchX().
 */
export function useResourceList<T = any>(endpoint: string, options: UseResourceListOptions) {
  const { listKey, totalKey = 'total', initialLimit = 10, searchDelay = 400, filters = {} } = options;

  const [items, setItems] = useState<T[]>([]);
  const [itemsEndpoint, setItemsEndpoint] = useState(endpoint);
  const [totalItems, setTotalItems] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1);
    }, searchDelay);
    return () => clearTimeout(timer);
  }, [searchTerm, searchDelay]);

  const filtersKey = JSON.stringify(filters);

  const refetch = useCallback(async () => {
    setIsFetching(true);
    setFetchError(false);
    try {
      const res = await axios.get(endpoint, {
        params: { page, limit, search: debouncedSearchTerm, ...filters },
      });
      if (res.data.status === 'success') {
        setItems(res.data.data[listKey] || []);
        setItemsEndpoint(endpoint);
        setTotalItems(res.data.data[totalKey] ?? 0);
      } else {
        setFetchError(true);
      }
    } catch (err) {
      setFetchError(true);
    } finally {
      setIsFetching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, limit, debouncedSearchTerm, filtersKey, listKey, totalKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // When `endpoint` itself changes (e.g. a page swaps list endpoints for
  // different tabs), `items` still holds the previous endpoint's rows for
  // one render until refetch resolves — those rows can have a completely
  // different shape, so callers must not render them under the new endpoint.
  const safeItems = itemsEndpoint === endpoint ? items : [];

  return {
    items: safeItems, setItems, totalItems, isFetching, fetchError, refetch,
    page, setPage, limit, setLimit,
    searchTerm, setSearchTerm,
  };
}
