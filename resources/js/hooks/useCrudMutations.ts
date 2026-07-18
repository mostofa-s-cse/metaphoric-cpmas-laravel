import { useCallback } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/useToast';

/**
 * Wraps create/update/remove for a REST-ish `/api/<resource>` endpoint so every
 * Dashboard list page doesn't hand-roll its own "post/patch/delete then refetch"
 * success handler. `refetch` is whatever the page's useResourceList (or other
 * fetch function) returns, so the table always reflects the latest server state
 * right after a mutation resolves.
 */
export function useCrudMutations(
  endpoint: string,
  handlePromise: ReturnType<typeof useToast>['handlePromise'],
  refetch: () => void | Promise<void>
) {
  const create = useCallback(
    async (payload: any, successMessage?: string, errorMessage?: string) => {
      const res = await handlePromise(axios.post(endpoint, payload), { successMessage, errorMessage });
      await refetch();
      return res;
    },
    [endpoint, handlePromise, refetch]
  );

  const update = useCallback(
    async (id: string, payload: any, successMessage?: string, errorMessage?: string) => {
      const res = await handlePromise(axios.patch(`${endpoint}/${id}`, payload), { successMessage, errorMessage });
      await refetch();
      return res;
    },
    [endpoint, handlePromise, refetch]
  );

  const remove = useCallback(
    async (id: string, successMessage?: string, errorMessage?: string) => {
      const res = await handlePromise(axios.delete(`${endpoint}/${id}`), { successMessage, errorMessage });
      await refetch();
      return res;
    },
    [endpoint, handlePromise, refetch]
  );

  return { create, update, remove };
}
