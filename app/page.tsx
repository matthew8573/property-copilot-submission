import Link from "next/link";

/** Whole-market facts, matching the seeded data (50 listings, 4 cities). */
const STATS = [
  { value: "50", label: "listings" },
  { value: "4", label: "cities" },
  { value: "$1.5k–$5.1k", label: "per month" }
];

export default function HomePage() {
  return (
    <section className="mx-auto max-w-4xl space-y-8 px-6 py-16">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/PropertyCopilotLogo.png"
          alt=""
          aria-hidden="true"
          className="h-12 w-12 object-contain"
        />
        <h1 className="text-5xl font-black tracking-tight text-slate-900">
          Property <span className="text-[#0077BE]">Copilot</span> — Map Browser
        </h1>
      </div>
      <p className="max-w-3xl text-base leading-relaxed text-slate-600">
        Browse Metro Vancouver rentals on a live map: 50 listings served from AWS
        (DynamoDB + Lambda), filterable by price, beds, baths, and property type, with
        the map and list always in sync.
      </p>
      <div className="flex flex-wrap items-center gap-6">
        <Link
          href="/browse"
          className="inline-block rounded-lg bg-[#0077BE] px-6 py-3 font-semibold text-white hover:bg-[#005f96]"
        >
          Browse Properties
        </Link>
        <ul className="flex gap-6">
          {STATS.map((stat) => (
            <li key={stat.label} className="text-center">
              <p className="text-2xl font-black tracking-tight text-slate-900">{stat.value}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {stat.label}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <Link href="/browse" className="block" aria-label="Open the map browser">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/browse-preview.jpg"
          alt="The Property Copilot map browser: a map of Metro Vancouver with listing clusters beside a filterable list of rental cards"
          className="w-full rounded-xl border border-slate-200 shadow-xl transition hover:shadow-2xl"
        />
      </Link>
    </section>
  );
}
