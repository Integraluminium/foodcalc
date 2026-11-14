import type {ReactNode} from "react";

export type BadgeVariant = 'success' | 'info' | 'warning' | 'neutral';

export interface BadgeItem {
  children: ReactNode;
  variant?: BadgeVariant;
  label?: string;
  className?: string;
}

export function Badge({children, variant = 'neutral', label, className }: BadgeItem) {
  const classes = ['badge', `badge--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} title={label}>
      {children}
    </span>
  );
}