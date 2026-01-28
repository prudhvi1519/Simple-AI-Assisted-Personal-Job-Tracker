type BadgeVariant =
    | "default"
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "info";

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    primary: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    danger: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    info: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

export default function Badge({
    children,
    variant = "default",
    className = "",
}: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center
        rounded-full px-2.5 py-0.5
        text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
        >
            {children}
        </span>
    );
}
