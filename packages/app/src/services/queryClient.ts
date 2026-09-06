import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

/**
 * Invalidate all server queries when business or store context changes.
 * This guarantees that store-specific queries (inventory, sales, catalog, batches)
 * from the previous store context are immediately wiped from memory and refetched.
 */
export const invalidateStoreContextQueries = async (): Promise<void> => {
  await queryClient.invalidateQueries();
  queryClient.clear();
};
