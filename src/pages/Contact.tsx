import { Button } from "@/components/ui/button";

const Contact = () => {
  return (
    <main className="dark relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 hospital-landing" />
        <div className="absolute inset-0 bg-slate-950/70" />
      </div>
      <div className="relative mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.6)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Contact
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Reach the Atria team
          </h1>
          <p className="mt-4 text-sm text-white/60">
            Share your project scope or request a design review. We respond to new inquiries within one business day.
          </p>

          <div className="mt-8 grid gap-6 text-sm text-white/70 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Email</p>
              <p className="mt-3 text-base text-white">ops@atria.health</p>
              <p className="mt-2 text-xs text-white/50">For pilots, demos, and design reviews</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Phone</p>
              <p className="mt-3 text-base text-white">+1 (555) 014-2210</p>
              <p className="mt-2 text-xs text-white/50">Weekdays, 9am–6pm ET</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-emerald-300 text-slate-900 hover:bg-emerald-200">
              <a href="/login">Client login</a>
            </Button>
            <Button variant="outline" asChild className="border-white/30 text-white hover:border-white/60 hover:bg-white/10">
              <a href="/">Back to homepage</a>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Contact;
