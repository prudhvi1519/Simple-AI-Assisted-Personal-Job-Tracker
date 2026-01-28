import { ReactNode } from "react";

interface Column<T> {
    key: string;
    header: string;
    render?: (item: T) => ReactNode;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (item: T) => string;
    onRowClick?: (item: T) => void;
    emptyMessage?: string;
}

export default function Table<T>({
    columns,
    data,
    keyExtractor,
    onRowClick,
    emptyMessage = "No data available",
}: TableProps<T>) {
    if (data.length === 0) {
        return (
            <div className="text-center py-12 text-[var(--muted)]">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]"
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                    {data.map((item) => (
                        <tr
                            key={keyExtractor(item)}
                            className={`
                hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors
                ${onRowClick ? "cursor-pointer" : ""}
              `}
                            onClick={() => onRowClick?.(item)}
                        >
                            {columns.map((col) => (
                                <td key={col.key} className="px-4 py-3">
                                    {col.render
                                        ? col.render(item)
                                        : (item as Record<string, unknown>)[col.key] as ReactNode}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
