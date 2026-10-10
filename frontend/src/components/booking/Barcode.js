// Decorative barcode derived from the booking id, so every ticket looks unique.
export default function Barcode({ value, className = '' }) {
  const bars = [];
  let x = 0;
  for (const char of value) {
    const code = char.charCodeAt(0);
    [1 + (code % 3), 1 + ((code >> 2) % 2), 1 + ((code >> 3) % 3)].forEach((width, i) => {
      if (i !== 1) bars.push(<rect key={`${x}`} x={x} y="0" width={width} height="40" />);
      x += width + 1;
    });
  }
  return (
    <svg viewBox={`0 0 ${x} 40`} preserveAspectRatio="none" className={className} aria-hidden>
      <g fill="currentColor">{bars}</g>
    </svg>
  );
}
