import { motion } from "framer-motion";

const AboutSection = () => {
  return (
    <section id="about" className="relative px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              About
            </p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-semibold text-foreground">
              Atria turns movement data into real-time care decisions
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Atria ingests simulation files and live tracking feeds, then builds a congestion
              heatmap that exposes bottlenecks, handoff delays, and hallway backups. Wood Wide AI
              reviews the numeric representation of tables, logs, and metrics conditioned on
              schema and units to detect anomalies. Google Gemini generates insight narratives and
              LLM feedback that shape action plans, while the Token company shortens hospital
              prompts by removing unnecessary words to lower token usage and cost.
            </p>
            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Goal:</span> reduce wait times,
                keep emergency corridors clear, and improve staff routing efficiency.
              </p>
              <p>
                <span className="font-semibold text-foreground">How:</span> normalize location
                streams, score congestion intensity, and generate action plans that rebalance
                rooms, resources, and routing in minutes.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Numeric Signals",
                  body: "Tables, logs, and metrics become clean numerical features.",
                },
                {
                  title: "Anomaly Focus",
                  body: "Wood Wide AI flags unusual flow spikes and bottlenecks.",
                },
                {
                  title: "Action Outcomes",
                  body: "Gemini drafts routing insights for operational leaders.",
                },
              ].map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(0_78%_55%)] to-transparent" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="mt-2 text-sm text-foreground/80">{card.body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative flex items-center justify-center"
          >
            <div className="group relative h-72 w-72">
              <div className="absolute inset-0 rounded-full border border-border/60 bg-card/60 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.3)]" />
              <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold tracking-wide">
                Atria
              </div>
              <div className="absolute inset-0">
                <div
                  className="absolute left-1/2 top-1/2"
                  style={{
                    transform: "translate(-50%, -50%) rotate(0deg) translateY(-120px) rotate(0deg)",
                  }}
                >
                  <div className="rounded-full border border-border/60 bg-background px-4 py-2 text-xs font-semibold text-foreground">
                    Wood Wide AI
                  </div>
                </div>
                <div
                  className="absolute left-1/2 top-1/2"
                  style={{
                    transform:
                      "translate(-50%, -50%) rotate(130deg) translateY(-120px) rotate(-130deg)",
                  }}
                >
                  <div className="rounded-full border border-border/60 bg-background px-4 py-2 text-xs font-semibold text-foreground">
                    Google Gemini
                  </div>
                </div>
                <div
                  className="absolute left-1/2 top-1/2"
                  style={{
                    transform:
                      "translate(-50%, -50%) rotate(230deg) translateY(-120px) rotate(-230deg)",
                  }}
                >
                  <div className="rounded-full border border-border/60 bg-background px-4 py-2 text-xs font-semibold text-foreground">
                    Token Company
                  </div>
                </div>
              </div>
              <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-border/70" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
