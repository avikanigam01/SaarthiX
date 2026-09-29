import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Show as the card title on small screens. */
  primary?: boolean;
};

/**
 * Responsive table: a real <table> from md upwards and a stacked card list on phones,
 * so nothing requires horizontal scrolling on small screens.
 */
export function DataTable<T>({
  columns, rows, rowKey, caption, footer,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  footer?: ReactNode;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("px-4 py-3 font-semibold", c.className)}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, i) => (
              <tr key={rowKey(row)} className="animate-row-in align-middle transition-colors hover:bg-brand-soft/40" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3", c.className)}>{c.cell(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-border md:hidden" aria-label={caption}>
        {rows.map((row, i) => (
          <li key={rowKey(row)} className="animate-row-in space-y-3 p-4" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
            {primary ? <div className="text-base font-semibold text-foreground">{primary.cell(row)}</div> : null}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {columns.filter((c) => c !== primary).map((c) => (
                <div key={c.key} className={c.key === "actions" ? "col-span-2" : ""}>
                  {c.key === "actions" ? null : <dt className="text-xs text-muted-foreground">{c.header}</dt>}
                  <dd className="mt-0.5 break-words text-foreground">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      {footer ? <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
