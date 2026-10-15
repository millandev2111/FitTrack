import { Dumbbell } from "lucide-react";

export function Logo({ size = 38 }: { size?: number }) {
  return (
    <span
      className="grad grid -rotate-8 place-items-center"
      style={{ width: size, height: size, borderRadius: size * 0.34 }}
      aria-hidden
    >
      <Dumbbell className="rotate-8" size={size * 0.55} strokeWidth={2.4} />
    </span>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5 font-display text-[17px] font-bold">
      <Logo />
      FitTracker
    </div>
  );
}
