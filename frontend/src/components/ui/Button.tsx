import React, { ButtonHTMLAttributes } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'inverse';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium text-[14px] leading-[1.2] rounded-md px-[14px] py-[8px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5e69d1]/50 disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-[#828fff] active:bg-[#5e69d1]",
      secondary: "bg-card text-foreground border border-border hover:bg-card/80",
      tertiary: "bg-background text-foreground hover:bg-card",
      inverse: "bg-white text-black hover:bg-gray-200"
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
