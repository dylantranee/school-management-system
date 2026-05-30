import React, { SelectHTMLAttributes } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, options, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-[13px] font-medium text-foreground">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "flex w-full rounded-md bg-card border border-transparent px-[12px] py-[8px] text-[16px] leading-[1.5] text-foreground transition-colors placeholder:text-muted-foreground",
            "focus:outline-none focus:border-[#5e69d1] focus:ring-2 focus:ring-[#5e69d1]/50",
            error && "border-destructive focus:border-destructive focus:ring-destructive/50",
            className
          )}
          {...props}
        >
          <option value="" disabled>Select an option...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-[12px] text-destructive">{error}</span>}
      </div>
    );
  }
);
Select.displayName = "Select";
