import { useRef, type PointerEvent } from "react";

type RangeSliderProps = {
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
};

// Dark thumbs with a white ring and shadow read clearly against both the pale
// track and the dark selected-range bar.
const INPUT_CLASSES =
  "pointer-events-none absolute inset-x-0 top-1/2 w-full -translate-y-1/2 appearance-none bg-transparent focus:outline-none " +
  "[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 " +
  "[&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:shadow-md " +
  "[&::-webkit-slider-thumb]:cursor-grab " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 " +
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white " +
  "[&::-moz-range-thumb]:bg-gray-900 [&::-moz-range-thumb]:shadow-md";

/**
 * Dual-thumb range slider built from two overlaid native range inputs, so it
 * keeps native keyboard and screen-reader behaviour without a dependency.
 * The thumbs handle their own drags; clicking anywhere else on the track jumps
 * whichever thumb is nearer to the click. The thumbs can never cross.
 */
export function RangeSlider({ min, max, step, low, high, onChange }: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lowPct = ((low - min) / (max - min)) * 100;
  const highPct = ((high - min) / (max - min)) * 100;

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // A press on a thumb targets its native input — let it drag as usual.
    if (event.target instanceof HTMLInputElement) {
      return;
    }
    const el = trackRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const snapped = Math.round((min + ratio * (max - min)) / step) * step;
    const value = Math.min(max, Math.max(min, snapped));
    // Move the nearer thumb, clamped so the two can't cross.
    if (Math.abs(value - low) <= Math.abs(value - high)) {
      onChange(Math.min(value, high - step), high);
    } else {
      onChange(low, Math.max(value, low + step));
    }
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={handleTrackPointerDown}
      className="relative h-7 cursor-pointer"
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gray-200" />
      <div
        className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gray-900"
        style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
      />
      <input
        type="range"
        aria-label="Minimum rent"
        min={min}
        max={max}
        step={step}
        value={low}
        onChange={(event) => onChange(Math.min(Number(event.target.value), high - step), high)}
        className={INPUT_CLASSES}
      />
      <input
        type="range"
        aria-label="Maximum rent"
        min={min}
        max={max}
        step={step}
        value={high}
        onChange={(event) => onChange(low, Math.max(Number(event.target.value), low + step))}
        className={INPUT_CLASSES}
      />
    </div>
  );
}
