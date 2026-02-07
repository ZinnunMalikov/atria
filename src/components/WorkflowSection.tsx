import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { 
  Users, 
  MapPin, 
  Activity, 
  BarChart3, 
  ArrowRight,
} from "lucide-react";

const workflowSteps = [
  {
    id: 1,
    icon: Users,
    title: "Collect Movement Data",
    description: "Track agents (patients, nurses, doctors) with continuous 2D coordinates (x, y) at discrete timesteps. Data stored as position over time.",
    color: "hero-cyan",
    details: ["Position tracking (x, y, t)", "Role-based agents", "0.5-1s timesteps"]
  },
  {
    id: 2,
    icon: MapPin,
    title: "Grid Aggregation",
    description: "Overlay a 2D grid on the floor plan. Bin agents into cells and track occupancy, dwell time, and flow metrics per cell.",
    color: "hero-magenta",
    details: ["Configurable cell size", "Multi-agent cells", "Real-time updates"]
  },
  {
    id: 3,
    icon: Activity,
    title: "Generate Heatmaps",
    description: "Visualize congestion patterns. Hot zones indicate high traffic areas that may need attention or redesign.",
    color: "hero-amber",
    details: ["Color intensity mapping", "Temporal analysis", "Zone identification"]
  },
  {
    id: 4,
    icon: BarChart3,
    title: "Optimize Flow",
    description: "Use insights to reduce wait times, rebalance staff assignments, and improve patient throughput.",
    color: "hero-blue",
    details: ["Bottleneck detection", "Route optimization", "Staffing recommendations"]
  }
];

const WorkflowSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const lineHeight = useTransform(scrollYProgress, [0.1, 0.9], ["0%", "100%"]);

  return (
    <section id="workflow" ref={containerRef} className="py-24 px-6 bg-background relative">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-accent font-medium text-sm uppercase tracking-wide">
            How It Works
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-6">
            From data to optimization
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Atria transforms raw movement tracking into actionable insights
            through a simple four-step process.
          </p>
        </motion.div>

        {/* Workflow Steps - Vertical Timeline */}
        <div className="relative">
          {/* Animated Connecting Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2">
            <motion.div
              style={{ height: lineHeight }}
              className="w-full bg-gradient-to-b from-hero-cyan via-hero-magenta to-hero-blue"
            />
          </div>

          {/* Steps */}
          <div className="space-y-16">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5 }}
                  className={`relative flex items-start gap-8 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  {/* Timeline Node */}
                  <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-accent border-4 border-background z-10" />

                  {/* Content Card */}
                  <div className={`ml-16 md:ml-0 md:w-5/12 ${isEven ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                    <div className={`inline-flex items-center gap-3 mb-3 ${isEven ? 'md:flex-row-reverse' : ''}`}>
                      <div className={`w-12 h-12 rounded-xl bg-${step.color}/10 flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 text-${step.color}`} />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Step {step.id}
                      </span>
                    </div>

                    <h3 className="font-display text-xl md:text-2xl font-bold mb-3">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {step.description}
                    </p>

                    <ul className={`space-y-1 ${isEven ? 'md:ml-auto' : ''}`}>
                      {step.details.map((detail, i) => (
                        <li key={i} className={`flex items-center gap-2 text-sm text-foreground ${isEven ? 'md:flex-row-reverse' : ''}`}>
                          <ArrowRight className={`w-3 h-3 text-accent ${isEven ? 'md:rotate-180' : ''}`} />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Spacer for opposite side */}
                  <div className="hidden md:block md:w-5/12" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;