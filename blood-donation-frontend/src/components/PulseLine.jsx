// Signature element: an ECG-style pulse line, used as a section divider
// and as a live indicator. `animated` draws it once on mount; otherwise
// it renders static (respects prefers-reduced-motion automatically via CSS).
export default function PulseLine({ className = "", animated = false, color = "text-crimson" }) {
  return (
    <svg
      className={`pulse-line ${animated ? "pulse-line--animated" : ""} ${color} ${className}`}
      viewBox="0 0 300 32"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0,16 L70,16 L85,4 L100,28 L115,16 L300,16" />
    </svg>
  );
}
