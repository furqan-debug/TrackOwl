import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: ReactNode;
    /** Optional left icon */
    leftIcon?: ReactNode;
    /** Optional right icon */
    rightIcon?: ReactNode;
    /** Show loading spinner */
    loading?: boolean;
    className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        'bg-primary text-base-white shadow-md shadow-primary/20 hover:brightness-110 active:scale-[0.98]',
    secondary:
        'bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-primary/5 shadow-sm',
    ghost:
        'bg-transparent text-[var(--text-muted)] hover:bg-primary/10 hover:text-primary',
    danger:
        'bg-rose-600 text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 active:scale-[0.98]',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-6 py-3 text-[10px]',
    md: 'px-8 py-4 text-[11px]',
    lg: 'px-10 py-5 text-[12px]',
};

export function Button({
    variant = 'primary',
    size = 'md',
    children,
    leftIcon,
    rightIcon,
    loading,
    className,
    disabled,
    type = 'button',
    ...rest
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={clsx(
                'inline-flex items-center justify-center gap-2 rounded-shell-md font-semibold tracking-tight transition-all focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50 disabled:pointer-events-none font-sans',
                variantClasses[variant],
                sizeClasses[size],
                className
            )}
            {...rest}
        >
            {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
            ) : (
                leftIcon && <span className="shrink-0">{leftIcon}</span>
            )}
            {children}
            {rightIcon && !loading && <span className="shrink-0">{rightIcon}</span>}
        </button>
    );
}
