import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'mint' | 'soft'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'brand-gradient text-white shadow-[var(--shadow-glow)] hover:brightness-[1.06] hover:shadow-[0_14px_34px_-10px_rgba(91,108,255,0.65)] disabled:shadow-none',
  secondary: 'bg-surface text-ink border border-line-strong shadow-[var(--shadow-card)] hover:bg-surface-2',
  ghost: 'text-ink-2 hover:text-ink hover:bg-surface-3/70',
  soft: 'bg-brand-soft text-brand hover:brightness-[0.97] dark:hover:brightness-110',
  danger: 'bg-danger text-white shadow-[0_10px_26px_-10px_rgba(229,72,77,0.6)] hover:brightness-[1.06]',
  mint: 'bg-gradient-to-br from-[#12c79b] to-[#13b5e0] text-white shadow-[0_10px_28px_-10px_rgba(19,181,160,0.7)] hover:brightness-[1.05]',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12.5px] rounded-[10px] gap-1.5',
  md: 'h-9.5 px-4 text-[13px] rounded-xl gap-2',
  lg: 'h-11 px-5 text-[14px] rounded-[14px] gap-2',
  xl: 'h-14 px-8 text-[16px] rounded-2xl gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})

export function IconButton({ className, children, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink active:scale-95',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
