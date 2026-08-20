import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const BINS = 24;

type Props = {
  analyser: AnalyserNode | null;
  active: boolean;
};

export function Waveform({ analyser, active }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const data = new Uint8Array(analyser?.frequencyBinCount ?? BINS);
    let raf = 0;

    const tick = (t: number) => {
      const bars = wrap.children;
      if (analyser && active) analyser.getByteFrequencyData(data);
      for (let i = 0; i < BINS; i++) {
        let amp: number;
        if (analyser && active) {
          const idx = Math.min(
            data.length - 1,
            Math.floor(i * (data.length / BINS)),
          );
          amp = data[idx] / 255;
        } else if (reduce) {
          amp = 0.2;
        } else {
          const phase = t / 420 + i * 0.38;
          amp = 0.16 + Math.sin(phase) * 0.08 + Math.sin(phase * 0.6) * 0.05;
        }
        const el = bars[i] as HTMLElement | undefined;
        if (el) el.style.height = `${Math.max(14, amp * 100)}%`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [analyser, active]);

  return (
    <div ref={wrapRef} className="flex h-10 items-center gap-0.5" aria-hidden>
      {Array.from({ length: BINS }, (_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block w-1 rounded-full",
            active ? "bg-primary" : "bg-muted/60",
          )}
          style={{ height: "20%" }}
        />
      ))}
    </div>
  );
}
