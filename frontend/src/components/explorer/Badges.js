const METHOD_STYLES = {
  GET: 'bg-teal-soft text-teal',
  POST: 'bg-marigold-soft text-marigold-deep',
  PATCH: 'bg-[#e4e2f7] text-[#4a3fa0]',
  DELETE: 'bg-rose-soft text-rose',
};

export function MethodBadge({ method }) {
  return (
    <span className={`inline-block w-16 shrink-0 rounded-md py-0.5 text-center font-mono text-xs font-bold ${METHOD_STYLES[method]}`}>
      {method}
    </span>
  );
}

const ACCESS = {
  public: { label: 'Public', className: 'text-ink-soft' },
  user: { label: 'Signed in', className: 'text-ink' },
  admin: { label: 'Admin', className: 'text-rose' },
};

export function AccessBadge({ access }) {
  const a = ACCESS[access];
  return <span className={`rounded-full border border-current/30 px-2 py-0.5 text-xs font-semibold ${a.className}`}>{a.label}</span>;
}
