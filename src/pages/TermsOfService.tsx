import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 turing-bg" />
        <div className="absolute inset-0 turing-grid opacity-35" />
        <div className="absolute inset-0 turing-lines turing-fade opacity-50" />
      </div>
      <div className="relative mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-3xl border border-border/60 bg-card/80 p-8 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.6)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Terms of Service
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">
            Platform terms for Atria operators
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            These terms summarize acceptable use, responsibilities, and operational expectations
            for Atria. The content below is placeholder text to help you stand up the pages.
          </p>

          <div className="mt-8 space-y-6 text-sm text-muted-foreground">
            <section>
              <h2 className="text-base font-semibold text-foreground">Access and eligibility</h2>
              <p className="mt-2">
                Atria is intended for authorized hospital staff and partners. Access is granted
                only to approved organizational accounts.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">Acceptable use</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Use operational insights to improve patient flow and safety.</li>
                <li>Do not upload PHI unless your organization has enabled compliant workflows.</li>
                <li>Respect rate limits and data governance requirements.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">Service availability</h2>
              <p className="mt-2">
                We monitor uptime continuously and schedule maintenance outside of peak hours when
                possible. Planned windows will be communicated in advance.
              </p>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
              <a href="/login">Return to login</a>
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

export default TermsOfService;
