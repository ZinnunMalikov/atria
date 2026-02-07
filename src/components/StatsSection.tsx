import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  {
    value: "35%",
    label: "Reduction in wait times",
    description: "Average improvement within 3 months"
  },
  {
    value: "2.5x",
    label: "Faster bottleneck detection",
    description: "Compared to manual observation"
  },
  {
    value: "1M+",
    label: "Data points processed",
    description: "Per hospital per month"
  },
  {
    value: "< 1s",
    label: "Heatmap refresh rate",
    description: "Real-time visualization updates"
  }
];

const StatsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="stats" ref={ref} className="relative py-32 px-6 navy-section overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 15 }).map((_, row) => (
            <div key={row} className="flex justify-around">
              {Array.from({ length: 20 }).map((_, col) => (
                <motion.div
                  key={`${row}-${col}`}
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: Math.random() * 0.5 + 0.1 } : {}}
                  transition={{ delay: (row + col) * 0.01, duration: 1 }}
                  className="w-1 h-1 rounded-full bg-white m-4"
                />
              ))}
            </div>
          ))}
        </div>

        {/* Animated Arc Lines */}
        <svg className="absolute right-0 top-0 w-1/2 h-full" viewBox="0 0 400 600" preserveAspectRatio="none">
          <motion.path
            d="M 400 50 Q 200 150 350 300 T 400 550"
            fill="none"
            stroke="hsl(35, 95%, 60%)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 0.6 } : {}}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
          <motion.path
            d="M 400 100 Q 150 200 300 350 T 400 600"
            fill="none"
            stroke="hsl(310, 80%, 60%)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 0.6 } : {}}
            transition={{ duration: 2, delay: 0.3, ease: "easeInOut" }}
          />
          <motion.path
            d="M 400 0 Q 250 100 380 250 T 400 500"
            fill="none"
            stroke="hsl(175, 80%, 55%)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 0.6 } : {}}
            transition={{ duration: 2, delay: 0.6, ease: "easeInOut" }}
          />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-16"
        >
          <span className="text-accent font-medium text-sm uppercase tracking-wide">
            Proven Results
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-6 text-white leading-tight">
            Real impact on
            <br />
            hospital operations
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Atria delivers measurable improvements to emergency department
            efficiency through data-driven insights and real-time optimization.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="stat-card"
            >
              <motion.h3
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                className="font-display text-4xl md:text-5xl font-bold text-white mb-2"
              >
                {stat.value}
              </motion.h3>
              <p className="text-white/90 text-sm font-medium mb-1">
                {stat.label}
              </p>
              <p className="text-white/50 text-sm">
                {stat.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Used By Leading Hospitals
          </p>
          <div className="mt-6 mx-auto max-w-5xl overflow-hidden rounded-full border border-white/15 bg-white/5 px-6">
            <div className="marquee flex w-max items-center gap-12 py-4 text-sm font-semibold text-white/80 whitespace-nowrap">
              <span>Johns Hopkins</span>
              <span>Mount Sinai</span>
              <span>Mass General</span>
              <span>Cleveland Clinic</span>
              <span>UCLA Health</span>
              <span>Mayo Clinic</span>
              <span>Stanford Health</span>
              <span>Northside Hospital</span>
              <span>NYU Langone</span>
              <span>Johns Hopkins</span>
              <span>Mount Sinai</span>
              <span>Mass General</span>
              <span>Cleveland Clinic</span>
              <span>UCLA Health</span>
              <span>Mayo Clinic</span>
              <span>Stanford Health</span>
              <span>Northside Hospital</span>
              <span>NYU Langone</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
