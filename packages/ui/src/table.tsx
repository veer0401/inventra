import * as React from "react";
import { cn } from "./utils";
import { Skeleton } from "./skeleton";

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table ref={ref} className={cn("w-full text-left text-xs border-collapse", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("border-b border-subtle bg-surface-muted/70 text-secondary font-semibold uppercase tracking-wider text-[10.5px]", className)} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("divide-y divide-subtle/80 text-secondary", className)} {...props} />
  )
);
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("hover:bg-surface-muted/50 transition-colors", className)} {...props} />
  )
);
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("py-2 px-3 font-semibold select-none text-left", className)} {...props} />
  )
);
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("py-2 px-3 align-middle", className)} {...props} />
  )
);
TableCell.displayName = "TableCell";

export const TableCellNumeric = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("py-2 px-3 align-middle text-right tabular-nums font-mono font-semibold text-primary", className)} {...props} />
  )
);
TableCellNumeric.displayName = "TableCellNumeric";

export const TableCellMono = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("py-2 px-3 align-middle font-mono text-primary", className)} {...props} />
  )
);
TableCellMono.displayName = "TableCellMono";

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div
          key={rIdx}
          className="p-3.5 rounded-md border border-subtle bg-surface flex items-center justify-between gap-4"
        >
          {Array.from({ length: columns }).map((_, cIdx) => (
            <Skeleton
              key={cIdx}
              className={cn("h-4", cIdx === 0 ? "w-1/3" : "w-16")}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
