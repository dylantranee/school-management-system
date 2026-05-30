import React, { InputHTMLAttributes } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        <input
          ref={ref}
          className={cn(
            "flex w-full rounded-md bg-card border border-transparent px-[12px] py-[8px] text-[16px] leading-[1.5] text-foreground transition-colors placeholder:text-muted-foreground",
            "focus:outline-none focus:border-[#5e69d1] focus:ring-2 focus:ring-[#5e69d1]/50",
            error && "border-destructive focus:border-destructive focus:ring-destructive/50",
            className
          )}
          {...props}
        />
        {error && <span className="text-[12px] text-destructive">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
