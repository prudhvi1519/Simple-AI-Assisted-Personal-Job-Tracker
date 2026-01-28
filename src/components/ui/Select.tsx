import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    error?: string;
    options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className = "", error, options, ...props }, ref) => {
        return (
            <div className="w-full">
                <select
                    ref={ref}
                    className={`
            w-full h-10 px-3
            text-sm
            rounded-lg border
            bg-[var(--background)]
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red-500" : "border-[var(--border)]"}
            ${className}
          `}
                    {...props}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                )}
            </div>
        );
    }
);

Select.displayName = "Select";

export default Select;
