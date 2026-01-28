import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = "", error, ...props }, ref) => {
        return (
            <div className="w-full">
                <input
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
                />
                {error && (
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";

export default Input;
