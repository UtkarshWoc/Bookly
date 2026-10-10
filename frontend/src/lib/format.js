export function formatMoney(amount, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', ...options }).format(
    new Date(value),
  );
}

export function formatTime(value) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function formatDateTime(value) {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

export function dateParts(value) {
  const date = new Date(value);
  return {
    day: date.getDate(),
    month: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date),
    weekday: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date),
  };
}

export function timeAgo(value) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDate(value);
}
