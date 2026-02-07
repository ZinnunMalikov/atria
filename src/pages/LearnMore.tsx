import { Button } from "@/components/ui/button";

const LearnMore = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-3xl border border-border/60 bg-card/80 p-8 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.6)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Learn More
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">
            How Atria turns movement data into action
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Atria combines your simulation files, real-time tracking, and operational context to
            generate heatmaps and recommendations. Wood Wise AI extracts numerical signals from
            movement paths, formats them into structured metrics, and produces actionable routing
            guidance for clinical teams.
          </p>

          <div className="mt-8 space-y-6 text-sm text-muted-foreground">
            <section>
              <h2 className="text-base font-semibold text-foreground">1. Capture</h2>
              <p className="mt-2">
                Upload CSV traces or connect live movement feeds. The system normalizes time-series
                signals so every care area can be compared on the same scale.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">2. Extract</h2>
              <p className="mt-2">
                Wood Wise AI identifies congestion clusters, dwell times, and routing inefficiencies.
                It converts those signals into clean numeric features for modeling and reporting.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">3. Recommend</h2>
              <p className="mt-2">
                The platform generates heatmaps, action plans, and staffing guidance that reduce
                wait times while preserving critical transport corridors for emergencies.
              </p>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
              <a href="/login">Client Log In</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/">Back to homepage</a>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LearnMore;
