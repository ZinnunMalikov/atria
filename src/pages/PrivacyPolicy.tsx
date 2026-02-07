import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
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
            Privacy Policy
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Your data, handled with care</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            This policy explains how Atria collects, uses, and safeguards information associated
            with your account and operational analytics. The details below are placeholders and can
            be replaced with your official legal copy.
          </p>

          <div className="mt-8 space-y-6 text-sm text-muted-foreground">
            <section>
              <h2 className="text-base font-semibold text-foreground">Information we collect</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Account details such as email address and role.</li>
                <li>Operational metadata from uploaded simulation files.</li>
                <li>Usage analytics to improve workflow recommendations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">How we use data</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Generate heatmaps and action plans tailored to your department.</li>
                <li>Maintain secure access and auditability for your organization.</li>
                <li>Improve platform performance and clinical insight accuracy.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">Data retention</h2>
              <p className="mt-2">
                Operational datasets are retained only as long as needed for reporting and are
                purged according to your hospital’s retention settings.
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

export default PrivacyPolicy;
