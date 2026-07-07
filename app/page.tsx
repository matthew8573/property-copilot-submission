export default function HomePage() {
  return (
    <section className="mx-auto max-w-3xl space-y-5 px-6 py-16">
      <h1 className="text-5xl font-black tracking-tight text-slate-900">
        Property <span className="text-[#0077BE]">Copilot</span> — Map Browser
      </h1>
      <p className="text-base leading-relaxed text-slate-600">
        Browse Metro Vancouver rentals on a live map: 50 listings served from AWS
        (DynamoDB + Lambda), filterable by price, beds, baths, and property type, with
        the map and list always in sync.
      </p>
    </section>
  );
}
