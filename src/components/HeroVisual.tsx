import { motion } from "framer-motion";
import { useMemo } from "react";
import { Activity, Users, Timer, TrendingUp } from "lucide-react";

const HeroVisual = () => {
  const heatmapCells = useMemo(
    () =>
      Array.from({ length: 32 }, () => ({
        hue: 175 - Math.random() * 60,
        lightness: 45 + Math.random() * 30,
        opacity: 0.5 + Math.random() * 0.5,
      })),
    [],
  );

  return (
    <div className="relative w-full h-[600px] [perspective:1200px] flex items-center justify-center">
      <div className="relative z-10 rounded-[32px] border border-white/30 bg-white/20 backdrop-blur-sm p-8">
        <div className="flex items-start justify-end gap-10">
          <div className="flex flex-col gap-6 pt-6">
          {/* Activity Chart Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="w-64 glass-card rounded-2xl p-4 shadow-xl rotate-[1.5deg]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Today's Flow</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>

            {/* Mini Chart */}
            <div className="flex items-end gap-1 h-16">
              {[40, 65, 45, 80, 55, 75, 60, 85, 70, 90, 65, 75].map((height, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: 1 + i * 0.05, duration: 0.4 }}
                  className="flex-1 rounded-t bg-gradient-to-t from-hero-blue to-hero-cyan"
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>6 AM</span>
              <span>Now</span>
            </div>
          </motion.div>

          {/* Staff Tracker Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="w-56 glass-card rounded-2xl p-4 shadow-xl rotate-[-1.5deg]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-hero-cyan/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-hero-cyan" />
              </div>
              <div>
                <p className="text-sm font-medium">Staff Movement</p>
                <p className="text-xs text-muted-foreground">Optimized routes</p>
              </div>
            </div>

            {/* Movement Paths */}
            <div className="relative h-20 bg-white/50 rounded-lg overflow-hidden">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 80">
                <motion.path
                  d="M 10 40 Q 50 10 100 40 T 190 40"
                  fill="none"
                  stroke="hsl(175, 80%, 45%)"
                  strokeWidth="2"
                  strokeDasharray="200"
                  initial={{ strokeDashoffset: 200 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ delay: 1.2, duration: 1.5, ease: "easeInOut" }}
                />
                <motion.path
                  d="M 10 60 Q 60 30 110 50 T 190 30"
                  fill="none"
                  stroke="hsl(310, 80%, 60%)"
                  strokeWidth="2"
                  strokeDasharray="200"
                  initial={{ strokeDashoffset: 200 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ delay: 1.4, duration: 1.5, ease: "easeInOut" }}
                />
              </svg>
            </div>
          </motion.div>
        </div>

        {/* Main Dashboard Card */}
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-4 w-80 glass-card rounded-2xl p-5 shadow-2xl rotate-[-1deg]"
          >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">ER Dashboard</span>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>

          {/* Heatmap Preview */}
          <div className="bg-white/70 rounded-xl p-4 mb-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
            <div className="grid grid-cols-8 gap-1">
              {heatmapCells.map((cell, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.02 }}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor: `hsl(${cell.hue}, 80%, ${cell.lightness}%)`,
                    opacity: cell.opacity,
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Congestion Heatmap</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 rounded-lg p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-hero-cyan" />
                <span className="text-xs text-muted-foreground">Patients</span>
              </div>
              <span className="text-xl font-bold">47</span>
            </div>
            <div className="bg-white/60 rounded-lg p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-4 h-4 text-hero-magenta" />
                <span className="text-xs text-muted-foreground">Avg Wait</span>
              </div>
              <span className="text-xl font-bold">12m</span>
            </div>
          </div>
          </motion.div>
        </div>
      </div>

      {/* Decorative Elements */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-32 right-96 w-3 h-3 rounded-full bg-white"
      />
      <motion.div
        animate={{
          y: [0, -15, 0],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-40 right-80 w-2 h-2 rounded-full bg-white"
      />
    </div>
  );
};

export default HeroVisual;
