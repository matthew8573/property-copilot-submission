type PriceHistogramProps = {
  /** Count of listings per price bucket (see buildRentHistogram). */
  counts: number[];
  min: number;
  max: number;
  /** Current selection; buckets overlapping [low, high] render solid. */
  low: number;
  high: number;
};

/**
 * Zillow-style price-frequency histogram that sits above the range slider.
 * Bars overlapping the selected range are solid; the rest fade back, so the
 * shape of the market stays visible while the selection reads at a glance.
 * Purely decorative (the slider owns interaction), hence aria-hidden.
 */
export function PriceHistogram({ counts, min, max, low, high }: PriceHistogramProps) {
  const peak = Math.max(1, ...counts);
  const bucketWidth = (max - min) / counts.length;

  return (
    <div className="flex h-16 items-end gap-px" aria-hidden="true">
      {counts.map((count, i) => {
        const bucketStart = min + i * bucketWidth;
        const bucketEnd = bucketStart + bucketWidth;
        const inRange = bucketEnd > low && bucketStart < high;
        // Empty buckets keep a faint stub so the axis reads as continuous.
        const heightPct = count === 0 ? 4 : 10 + (count / peak) * 90;
        return (
          <div
            key={i}
            className={`min-w-0 flex-1 rounded-sm transition-colors ${
              inRange ? "bg-blue-600" : "bg-blue-600/20"
            }`}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}
