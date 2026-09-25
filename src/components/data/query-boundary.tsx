import type { UseQueryResult } from "@tanstack/react-query";
import { FileQuestion, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/saarthi-ui";

type Props<T> = {
  query: Pick<UseQueryResult<T>, "data" | "isLoading" | "isError" | "refetch">;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: ReactNode;
  /** Decide when the loaded data counts as "empty" (default: empty array / null). */
  isEmpty?: (data: T) => boolean;
  children: (data: NonNullable<T>) => ReactNode;
};

/** Every database-driven screen: loading -> error -> empty -> success (§44). */
export function QueryBoundary<T>({
  query,
  loadingLabel = "Loading information...",
  emptyTitle = "No data available yet.",
  emptyDescription,
  emptyIcon = FileQuestion,
  emptyAction,
  isEmpty,
  children,
}: Props<T>) {
  if (query.isLoading) return <LoadingState label={loadingLabel} />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;

  const data = query.data;
  const empty = data == null || (isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0);
  if (empty || data === undefined) {
    return (
      <EmptyState
        title={emptyTitle}
        icon={emptyIcon}
        {...(emptyDescription ? { description: emptyDescription } : {})}
        {...(emptyAction ? { action: emptyAction } : {})}
      />
    );
  }
  return <>{children(data as NonNullable<T>)}</>;
}
