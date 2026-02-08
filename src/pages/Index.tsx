const Index = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hospital-landing" aria-hidden="true" />
        <div className="relative z-10">
          <header className="mx-auto flex w-full max-w-6xl items-center px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                <img src="/atria-logo.png" alt="Atria logo" className="h-7 w-7 object-contain" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-white/60">Atria</p>
                <p className="text-lg font-semibold">Hospital Layout Intelligence</p>
              </div>
            </div>
            <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex ml-10">
              <a className="transition hover:text-white" href="#method">Method</a>
              <a className="transition hover:text-white" href="#scenarios">Scenarios</a>
              <a className="transition hover:text-white" href="#outputs">Outputs</a>
              <a className="transition hover:text-white" href="#architects">Architects</a>
            </nav>
            <div className="ml-auto hidden items-center gap-3 md:flex">
              <a
                className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-white/50 hover:text-white"
                href="/login"
              >
                Client Login
              </a>
            </div>
          </header>

          <main>
            <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-16 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/70">
                  Built for surge modeling
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                </div>
                <div className="space-y-6">
                  <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                    Model hospital traffic the way it really behaves during high-acuity events.
                  </h1>
                  <p className="text-lg text-white/70">
                    Most hospital simulations focus on waiting time or bed occupancy. Atria models the dynamic
                    congestion inside corridors where patient transfers, staff, and equipment collide. We treat movement as
                    acuity clumps and stress-test layout resilience before a single wall is built.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Input</p>
                    <p className="mt-3 text-sm text-white/80">
                      Upload a simplified hospital floor plan represented as nodes (rooms) and edges (hallways).
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Output</p>
                    <p className="mt-3 text-sm text-white/80">
                      Heatmaps that surface high-friction zones where congestion repeatedly delays care.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded-full bg-emerald-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-900">
                    Upload Floor Plan
                  </button>
                  <button className="rounded-full border border-white/30 px-6 py-3 text-xs uppercase tracking-[0.25em] text-white/70">
                    Download Sample Graph
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-6 rounded-[32px] bg-emerald-400/20 blur-3xl" aria-hidden="true" />
                <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-900/70 p-6 shadow-[0_35px_120px_-60px_rgba(16,185,129,0.65)]">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
                    <span>Hospital Layout Grid</span>
                    <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] text-white/50">Live</span>
                  </div>
                  <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div
                      className="relative grid h-64 w-full grid-cols-7 grid-rows-5 gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-3"
                      aria-label="Hospital layout grid with congestion hotspots"
                    >
                      {Array.from({ length: 35 }).map((_, index) => {
                        const isHotspot = [3, 10, 18, 24, 31].includes(index);
                        return (
                          <div
                            key={index}
                            className={`rounded-lg border ${
                              isHotspot
                                ? "border-emerald-300/60 bg-emerald-300/20 shadow-[0_0_24px_rgba(52,211,153,0.35)]"
                                : "border-white/10 bg-slate-900/60"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 text-xs text-white/60 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.3em]">Acuity Clumps</p>
                      <p className="mt-2 text-white/80">Patient + staff + equipment move as one unit.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.3em]">Corridor Load</p>
                      <p className="mt-2 text-white/80">Agent-based flow highlights merge points.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.3em]">Heat Zones</p>
                      <p className="mt-2 text-white/80">Repeated delays reveal design friction.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="method" className="relative border-t border-white/10 bg-slate-950/80">
              <div className="mx-auto w-full max-w-6xl px-6 py-16">
                <div className="grid gap-10 lg:grid-cols-[0.45fr_0.55fr]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Method</p>
                    <h2 className="mt-4 text-3xl font-semibold text-white">
                      A workflow built for dynamic, congested corridors.
                    </h2>
                    <p className="mt-4 text-white/70">
                      Traditional models assume steady flow. We simulate surge scenarios where traffic multiplies, acuity
                      clumps merge, and bottlenecks reveal themselves in shared hallways.
                    </p>
                  </div>
                  <div className="grid gap-4">
                    {[
                      {
                        title: "Upload a graph-based floor plan",
                        copy: "Nodes capture rooms, edges define corridors and transfer paths.",
                      },
                      {
                        title: "Define high-load events",
                        copy: "Shift changes, mass-casualty incidents, pandemic surges, or extreme transfer days.",
                      },
                      {
                        title: "Model acuity clumps",
                        copy: "Every transfer bundles staff, equipment, and patient acuity into one moving unit.",
                      },
                      {
                        title: "Run agent-based flow",
                        copy: "Watch clumps interact, merge, and slow when corridor capacity is exceeded.",
                      },
                      {
                        title: "Generate friction heatmaps",
                        copy: "Consistent delays highlight hallways that compromise care timelines.",
                      },
                    ].map((item, index) => (
                      <div
                        key={item.title}
                        className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
                        style={{ animationDelay: `${index * 0.08}s` }}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-white/70">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-white">{item.title}</h3>
                          <p className="mt-2 text-sm text-white/70">{item.copy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section id="scenarios" className="mx-auto w-full max-w-6xl px-6 py-16">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Scenario Studio</p>
                  <h2 className="mt-4 text-3xl font-semibold text-white">Stress test every extreme.</h2>
                </div>
                <p className="max-w-xl text-sm text-white/70">
                  Model mass-casualty incidents, pandemic staffing constraints, or extreme transfer pressure. Compare
                  alternate layouts side-by-side before design decisions become permanent.
                </p>
              </div>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Mass-Casualty Incident",
                    detail: "Traffic spikes in ED, imaging, and OR corridors within minutes.",
                    tag: "MCI",
                  },
                  {
                    title: "Pandemic Surge",
                    detail: "Sustained high throughput with isolation routing and staffing limits.",
                    tag: "Pandemic",
                  },
                  {
                    title: "Extreme Transfers",
                    detail: "Multiple ICU-level transfers with equipment-heavy clumps.",
                    tag: "Acuity+",
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="group rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 transition hover:border-emerald-200/40"
                  >
                    <span className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/60">
                      {card.tag}
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
                    <p className="mt-3 text-sm text-white/70">{card.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="outputs" className="border-t border-white/10 bg-slate-950/70">
              <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[0.55fr_0.45fr]">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Outputs</p>
                  <h2 className="mt-4 text-3xl font-semibold text-white">See congestion before it happens.</h2>
                  <p className="mt-4 text-white/70">
                    Heatmaps highlight corridor friction, transfer delays, and merge points that consistently slow care. Every
                    output is exportable for architects, operations teams, and executive reviews.
                  </p>
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {[
                      "Heatmap overlays for corridor congestion",
                      "Bottleneck reports by acuity level",
                      "Scenario comparisons for layout alternatives",
                      "Transfer delay timelines for critical paths",
                    ].map((item) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
                    <span>Heatmap Summary</span>
                    <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] text-white/50">Corridor 3</span>
                  </div>
                  <div className="mt-6 space-y-4">
                    {[
                      { label: "Acuity Clump Density", value: "High", color: "bg-rose-500" },
                      { label: "Transfer Delay", value: "Elevated", color: "bg-amber-400" },
                      { label: "Merge Points", value: "4 hotspots", color: "bg-emerald-400" },
                    ].map((row) => (
                      <div key={row.label} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white/80">{row.label}</p>
                          <span className={`h-2 w-12 rounded-full ${row.color}`} />
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/50">{row.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section id="architects" className="mx-auto w-full max-w-6xl px-6 py-16">
              <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-emerald-300/10 via-transparent to-white/5 p-10">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Purpose</p>
                <h2 className="mt-4 text-3xl font-semibold text-white">
                  Built for architects and administrators before construction begins.
                </h2>
                <p className="mt-4 max-w-3xl text-white/70">
                  Atria is designed for early design reviews. Run surge scenarios, validate corridor sizing, and identify
                  high-friction zones long before a hospital opens its doors.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/70">
                    Pre-construction validation
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/70">
                    Layout optimization
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/70">
                    Clinical operations alignment
                  </span>
                </div>
              </div>
            </section>

            <section className="border-t border-white/10 bg-slate-950/80">
              <div className="mx-auto w-full max-w-6xl px-6 py-16">
                <div className="flex flex-col items-start justify-between gap-6 rounded-[30px] border border-white/10 bg-white/5 p-10 lg:flex-row lg:items-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Next Step</p>
                    <h2 className="mt-4 text-3xl font-semibold text-white">Ready to stress-test a new layout?</h2>
                    <p className="mt-3 text-white/70">
                      Share a graph-based floor plan and we will run surge scenarios tailored to your facility.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button className="rounded-full bg-emerald-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-900">
                      Start Scenario
                    </button>
                    <button className="rounded-full border border-white/25 px-6 py-3 text-xs uppercase tracking-[0.25em] text-white/70">
                      Talk to Us
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <footer className="border-t border-white/10 bg-slate-950/90">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-white">Atria</p>
                <p className="mt-2 max-w-sm text-white/50">
                  Hospital layout intelligence for surge-ready design decisions.
                </p>
              </div>
              <div className="flex flex-wrap gap-6 text-xs uppercase tracking-[0.3em]">
                <span>Privacy</span>
                <span>Terms</span>
                <span>Contact</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Index;
