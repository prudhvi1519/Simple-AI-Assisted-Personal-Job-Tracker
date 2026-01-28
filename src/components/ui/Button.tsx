import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white",
    secondary:
        "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[var(--foreground)]",
    danger:
        "bg-red-600 hover:bg-red-700 text-white",
    ghost:
        "hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--foreground)]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant = "primary", isLoading, disabled, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={`
          inline-flex items-center justify-center gap-2
          px-4 py-2 rounded-lg
          text-sm font-medium
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${className}
        `}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export default Button;
