import { QueryClient } from "@tanstack/react-query";

import { sessionQueryHash } from "./session";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: sessionQueryHash,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
