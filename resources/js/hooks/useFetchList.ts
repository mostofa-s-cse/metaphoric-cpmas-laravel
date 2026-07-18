import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * For endpoints that return the full list in one shot (no server-side pagination) —
 * e.g. the Website CMS tabs (Portfolio/Services/Team/Trust/Testimonials/FAQs), where
 * `res.data.data` IS the array. Pairs with useCrudMutations for create/update/delete
 * + auto-refetch. For paginated/searchable list endpoints, use useResourceList instead.
 */
export function useFetchList<T = any>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(endpoint);
      if (res.data.status === 'success') {
        setItems(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, setItems, isLoading, refetch };
}
