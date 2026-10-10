import { useId } from 'react';

export const inputClasses =
  'h-11 w-full rounded-xl border border-line bg-card px-3.5 text-[15px] text-ink placeholder:text-ink-soft/70 focus:border-ink focus:outline-none aria-[invalid=true]:border-rose';

export default function Field({ label, hint, error, as = 'input', className = '', ...props }) {
  const id = useId();
  const Control = as;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <Control
        id={id}
        className={as === 'textarea' ? `${inputClasses} h-auto min-h-24 py-2.5` : inputClasses}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-rose">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// Maps a backend validation error ({ details: [{ field, message }] }) to { field: message }.
export function fieldErrors(error) {
  if (!Array.isArray(error?.details)) return {};
  return Object.fromEntries(error.details.map((d) => [d.field, d.message]));
}
