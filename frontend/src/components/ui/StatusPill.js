const STYLES = {
  PENDING: { label: 'Awaiting payment', className: 'bg-marigold-soft text-marigold-deep' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-teal-soft text-teal' },
  FAILED: { label: 'Payment failed', className: 'bg-rose-soft text-rose' },
  CANCELLED: { label: 'Released', className: 'bg-ink/5 text-ink-soft' },
  EXPIRED: { label: 'Hold expired', className: 'bg-ink/5 text-ink-soft' },
};

export default function StatusPill({ status }) {
  const style = STYLES[status] || { label: status, className: 'bg-ink/5 text-ink-soft' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
