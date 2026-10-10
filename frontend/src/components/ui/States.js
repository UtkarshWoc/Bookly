import { ButtonLink } from './Button';

export function Spinner({ label = 'Loading' }) {
  return (
    <div role="status" className="flex items-center gap-3 py-16 text-ink-soft">
      <span className="size-5 animate-spin rounded-full border-2 border-ink/20 border-r-ink" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

export function EmptyState({ title, children, actionHref, actionLabel }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <p className="font-display text-xl font-semibold">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-ink-soft">{children}</p>}
      {actionHref && (
        <ButtonLink href={actionHref} variant="outline" className="mt-6">
          {actionLabel}
        </ButtonLink>
      )}
    </div>
  );
}

export function ErrorNotice({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl bg-rose-soft px-5 py-4 text-rose">
      <p className="font-semibold">{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-semibold underline underline-offset-4">
          Try again
        </button>
      )}
    </div>
  );
}
