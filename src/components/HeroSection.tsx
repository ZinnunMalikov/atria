import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import HeroVisual from "./HeroVisual";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 gradient-hero opacity-90" />
      
      {/* Subtle Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px'
        }}
      />

      {/* Ambient Orbs */}
      <div className="absolute -top-28 right-[-10%] h-[420px] w-[420px] rounded-full bg-red-200/30 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-5%] h-[520px] w-[520px] rounded-full bg-rose-200/25 blur-3xl" />
      <div className="absolute top-1/3 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-red-100/40 blur-2xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-200px)]">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-md text-foreground text-sm font-medium mb-8 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.6)]"
            >
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Real-time ER tracking & optimization
            </motion.div>

            {/* Headline */}
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.05] mb-6 text-balance">
              <span className="text-foreground">Visualize</span>
              <br />
              <span className="text-foreground">& optimize</span>
              <br />
              <span className="gradient-text">your ER</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-foreground/70 max-w-lg mb-8 leading-relaxed text-balance">
              Transform raw movement data into actionable heatmaps. 
              Track patient flow, identify bottlenecks, and optimize 
              staff routing in real-time.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-hero-blue to-hero-cyan text-white hover:from-hero-blue/90 hover:to-hero-cyan/90 rounded-lg font-medium group h-12 px-8 shadow-[0_18px_45px_-20px_rgba(14,116,144,0.8)]"
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Try the Demo
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/80 border-white/60 text-foreground hover:bg-white rounded-lg font-medium h-12 px-8"
                onClick={() => {
                  document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Learn More
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-foreground/70">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-hero-cyan" />
                HIPAA-ready analytics
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-hero-blue" />
                Live congestion signals
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-hero-cyan" />
                Route optimization models
              </span>
            </div>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <HeroVisual />
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
    </section>
  );
};

export default HeroSection;
