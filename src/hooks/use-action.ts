import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

import { devLog, toUserMessage } from "@/lib/errors";

/**
 * Wraps a service call: toast on success, human-readable toast on failure
 * (never a raw database error), and refreshes the listed queries.
 */
export function useAction<TVars, TData = unknown>(
  fn: (vars: TVars) => Promise<TData>,
  options: {
    success?: string | ((data: TData) => string);
    invalidate?: QueryKey[];
    fallbackError?: string;
    onSuccess?: (data: TData, vars: TVars) => void;
    silentError?: boolean;
  } = {},
) {
  const queryClient = useQueryClient();
  return useMutation<TData, unknown, TVars>({
    mutationFn: fn,
    onSuccess: (data, vars) => {
      if (options.success) toast.success(typeof options.success === "function" ? options.success(data) : options.success);
      for (const key of options.invalidate ?? []) void queryClient.invalidateQueries({ queryKey: key });
      options.onSuccess?.(data, vars);
    },
    onError: (error) => {
      devLog("action", error);
      if (!options.silentError) toast.error(toUserMessage(error, options.fallbackError));
    },
  });
}
