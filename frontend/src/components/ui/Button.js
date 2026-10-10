import Link from 'next/link';

const VARIANTS = {
  primary: 'bg-ink text-white hover:bg-ink/90 disabled:bg-ink/40',
  accent: 'bg-marigold text-ink hover:bg-[#dc952b] disabled:bg-marigold/50',
  outline: 'border border-line bg-card text-ink hover:border-ink/40 disabled:text-ink-soft',
  ghost: 'text-ink hover:bg-ink/5 disabled:text-ink-soft',
  danger: 'border border-rose/30 bg-card text-rose hover:bg-rose-soft disabled:opacity-50',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-13 px-6 text-base',
};

export function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export default function Button({ variant, size, loading = false, className, children, disabled, ...props }) {
  return (
    <button
      type="button"
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant, size, className, children, ...props }) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
