// Iconos de deportes que no existen en lucide, con el mismo estilo de trazo.
type P = { size?: number; className?: string; strokeWidth?: number };

const base = (size = 24, strokeWidth = 2) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function SoccerBall({ size, className, strokeWidth }: P) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m12 7 4 3-1.5 4.5h-5L8 10z" />
      <path d="M12 7V2.5M16 10l4.2-1.6M14.5 14.5l2.6 3.8M9.5 14.5l-2.6 3.8M8 10 3.8 8.4" />
    </svg>
  );
}

export function Basketball({ size, className, strokeWidth }: P) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2v20" />
      <path d="M5 4.9a10 10 0 0 1 0 14.2M19 4.9a10 10 0 0 0 0 14.2" />
    </svg>
  );
}

export function Racket({ size, className, strokeWidth }: P) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <ellipse cx="14.5" cy="9.5" rx="6.5" ry="6.5" transform="rotate(45 14.5 9.5)" />
      <path d="m10 14-6.5 6.5M8.5 12.5l3 3" />
      <path d="M11 7l6 6M12.5 5.5l6 6M9.8 9.2l5 5" opacity=".5" />
    </svg>
  );
}

export function Swim({ size, className, strokeWidth }: P) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="17" cy="6" r="2" />
      <path d="m4 13 5-4 3 3 3-2" />
      <path d="M2 18c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0" />
    </svg>
  );
}
