import { BATHROOM_OPTIONS, BEDROOM_OPTIONS, countActiveFilters } from "@/lib/filters";
import type { PlaceSuggestion } from "@/lib/geocode";
import { PROPERTY_TYPES, type PropertyFilter, type PropertyType } from "@/lib/types";
import { FilterChip } from "./FilterChip";
import { PriceControl } from "./PriceControl";
import { SearchBox } from "./SearchBox";

const TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Apartment",
  condo: "Condo",
  house: "House",
  townhouse: "Townhouse"
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path d="M3 8.5l3.5 3.5L13 5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-7 w-7"
};

/** Simple line icons so each property type reads at a glance on its button. */
function TypeIcon({ type }: { type: PropertyType | "any" }) {
  switch (type) {
    case "house":
      return (
        <svg {...ICON_PROPS} aria-hidden="true">
          <path d="M3 11l9-7 9 7" />
          <path d="M5.5 9.5V20h13V9.5" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "apartment":
      return (
        <svg {...ICON_PROPS} aria-hidden="true">
          <rect x="5" y="3" width="14" height="18" rx="1" />
          <path d="M9 7h1.5M14 7h1.5M9 11h1.5M14 11h1.5M9 15h1.5M14 15h1.5" />
          <path d="M11 21v-3h2v3" />
        </svg>
      );
    case "condo":
      return (
        <svg {...ICON_PROPS} aria-hidden="true">
          <path d="M6 21V6l7-3v18" />
          <path d="M13 21V9l5 2v10" />
          <path d="M9 8h1.5M9 12h1.5M9 16h1.5M16 13h.5M16 16h.5" />
        </svg>
      );
    case "townhouse":
      return (
        <svg {...ICON_PROPS} aria-hidden="true">
          <path d="M3 20v-9l4-3.5L11 11v9" />
          <path d="M11 20v-9l4-3.5L19 11v9" />
          <path d="M6 20v-4h2v4M14 20v-4h2v4" />
        </svg>
      );
    default:
      return (
        <svg {...ICON_PROPS} aria-hidden="true">
          <path d="M3 10.5l9-6 9 6" />
          <path d="M6 9v8h5M18 9v3" />
          <path d="M14 20a3 3 0 013-3 3 3 0 013 3z" />
        </svg>
      );
  }
}

type OptionMenuProps = {
  options: { label: string; value: number | null }[];
  value: number | null;
  onSelect: (value: number | null) => void;
  close: () => void;
};

/** Single-select dropdown list for minimum Beds/Baths; picking closes it. */
function OptionMenu({ options, value, onSelect, close }: OptionMenuProps) {
  return (
    <div className="py-1.5" role="menu">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            onClick={() => {
              onSelect(option.value);
              close();
            }}
            className={`flex w-full items-center justify-between px-3 py-2 text-sm transition hover:bg-slate-50 ${
              selected ? "font-semibold text-blue-700" : "text-slate-900"
            }`}
          >
            {option.label}
            {selected ? <CheckIcon /> : null}
          </button>
        );
      })}
    </div>
  );
}

type TypeButtonProps = {
  label: string;
  icon: PropertyType | "any";
  active: boolean;
  onClick: () => void;
  className?: string;
};

/** One large, Zillow-style tappable type tile: icon over label. */
function TypeButton({ label, icon, active, onClick, className = "" }: TypeButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-5 text-sm font-semibold transition ${
        active
          ? "border-blue-600 bg-blue-50 text-blue-700"
          : "border-slate-300 text-slate-800 hover:border-slate-500"
      } ${className}`}
    >
      <TypeIcon type={icon} />
      {label}
    </button>
  );
}

type TypeMenuProps = {
  selected: PropertyType[];
  onChange: (types: PropertyType[]) => void;
};

/**
 * Property type as a grid of large icon buttons (Zillow-style): "Any" clears
 * the selection, and each type toggles independently (multi-select), so the
 * menu stays open while picking.
 */
function TypeMenu({ selected, onChange }: TypeMenuProps) {
  const toggle = (type: PropertyType) => {
    onChange(
      selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type]
    );
  };

  return (
    <div className="grid grid-cols-2 gap-2.5 p-3">
      <TypeButton
        label="Any"
        icon="any"
        active={selected.length === 0}
        onClick={() => onChange([])}
        className="col-span-2"
      />
      {PROPERTY_TYPES.map((type) => (
        <TypeButton
          key={type}
          label={TYPE_LABELS[type]}
          icon={type}
          active={selected.includes(type)}
          onClick={() => toggle(type)}
        />
      ))}
    </div>
  );
}

function minimumOptions(values: readonly number[]): { label: string; value: number | null }[] {
  return [{ label: "Any", value: null }, ...values.map((v) => ({ label: `${v}+`, value: v }))];
}

function minimumLabel(value: number | undefined): string {
  return value === undefined ? "Any" : `${value}+`;
}

function typeLabel(types: PropertyType[] | undefined): string {
  if (!types || types.length === 0) {
    return "Any";
  }
  const first = TYPE_LABELS[types[0]];
  return types.length === 1 ? first : `${first} +${types.length - 1}`;
}

type FilterBarProps = {
  filter: PropertyFilter;
  onChange: (filter: PropertyFilter) => void;
  /** Picked a place in the search box — the page re-frames the map to it. */
  onSelectPlace: (place: PlaceSuggestion) => void;
  /** Instant local suggestions for the search box (geocoder fallback). */
  placeFallback?: (query: string) => PlaceSuggestion[];
  /** Whole-market rent distribution for the Price histogram. */
  rentHistogram?: number[];
  /** "horizontal" = top bar (mobile); "vertical" = stacked left rail (desktop). */
  orientation?: "horizontal" | "vertical";
};

/**
 * Search + Price · Beds · Baths · Type, all as chip-dropdowns in one visual
 * pattern. Every control edits one dimension of the shared PropertyFilter;
 * filters compose with AND semantics server-side. Reset appears only when
 * something is constrained. Renders as a horizontal top bar or a vertical rail;
 * in the rail the popovers fly out to the right so they clear the narrow column.
 */
export function FilterBar({
  filter,
  onChange,
  onSelectPlace,
  placeFallback,
  rentHistogram,
  orientation = "horizontal"
}: FilterBarProps) {
  const activeCount = countActiveFilters(filter);
  const vertical = orientation === "vertical";
  const placement = vertical ? "right" : "bottom";

  const controls = (
    <>
      <PriceControl
        minRent={filter.minRent}
        maxRent={filter.maxRent}
        histogram={rentHistogram}
        onChange={(minRent, maxRent) => onChange({ ...filter, minRent, maxRent })}
        placement={placement}
        fullWidth={vertical}
      />
      <FilterChip
        label="Beds"
        valueLabel={minimumLabel(filter.bedrooms)}
        active={filter.bedrooms !== undefined}
        panelClassName="w-44"
        placement={placement}
        fullWidth={vertical}
      >
        {(close) => (
          <OptionMenu
            options={minimumOptions(BEDROOM_OPTIONS)}
            value={filter.bedrooms ?? null}
            onSelect={(bedrooms) => onChange({ ...filter, bedrooms: bedrooms ?? undefined })}
            close={close}
          />
        )}
      </FilterChip>
      <FilterChip
        label="Baths"
        valueLabel={minimumLabel(filter.bathrooms)}
        active={filter.bathrooms !== undefined}
        panelClassName="w-44"
        placement={placement}
        fullWidth={vertical}
      >
        {(close) => (
          <OptionMenu
            options={minimumOptions(BATHROOM_OPTIONS)}
            value={filter.bathrooms ?? null}
            onSelect={(bathrooms) => onChange({ ...filter, bathrooms: bathrooms ?? undefined })}
            close={close}
          />
        )}
      </FilterChip>
      <FilterChip
        label="Property Type"
        valueLabel={typeLabel(filter.propertyTypes)}
        active={filter.propertyTypes !== undefined && filter.propertyTypes.length > 0}
        panelClassName="w-72"
        placement={placement}
        fullWidth={vertical}
      >
        {() => (
          <TypeMenu
            selected={filter.propertyTypes ?? []}
            onChange={(types) =>
              onChange({ ...filter, propertyTypes: types.length > 0 ? types : undefined })
            }
          />
        )}
      </FilterChip>
      {activeCount > 0 ? (
        <button
          type="button"
          onClick={() => onChange({})}
          className={`text-sm font-medium text-slate-900 underline-offset-2 transition hover:text-blue-600 hover:underline ${
            vertical ? "mt-1 text-left" : ""
          }`}
        >
          Reset filters
        </button>
      ) : null}
    </>
  );

  if (vertical) {
    return (
      <div className="flex flex-col gap-2">
        <SearchBox
          onSelectPlace={onSelectPlace}
          fallback={placeFallback}
          wrapperClassName="w-full"
        />
        {controls}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
      <SearchBox onSelectPlace={onSelectPlace} fallback={placeFallback} />
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{controls}</div>
    </div>
  );
}
