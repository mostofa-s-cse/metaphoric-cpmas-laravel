
import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  // Styles configuration
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer rounded-xl';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-[10px] gap-1.5',
    md: 'px-4 py-2.5 text-xs gap-2',
    lg: 'px-5 py-3 text-sm gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg hover:shadow-cyan-500/10 border-none',
    secondary: 'bg-slate-900 hover:bg-slate-900/80 text-slate-300 border border-slate-800',
    danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 hover:border-rose-500/40',
    ghost: 'bg-transparent hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 border-none',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
      {!loading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
}
