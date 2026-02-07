import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, MessageCircle } from "lucide-react";

// Sample data format: x, y, timestamp, agent_type
const sampleData = `15,12,0,patient
30,18,0,nurse
82,16,0,doctor
22,28,1,patient
35,24,1,nurse
76,22,1,doctor
18,42,2,patient
40,34,2,nurse
68,30,2,doctor
28,52,3,patient
46,38,3,nurse
62,36,3,doctor
34,62,4,patient
54,44,4,nurse
58,48,4,doctor
70,58,5,patient
60,56,5,nurse
50,60,5,doctor
24,72,6,patient
44,70,6,nurse
74,74,6,doctor
12,86,7,patient
36,82,7,nurse
64,84,7,doctor
88,78,8,patient
80,64,8,nurse
72,50,8,doctor
10,30,9,patient
90,28,9,nurse
84,40,9,doctor`;

interface HeatmapCell {
  x: number;
  y: number;
  intensity: number;
  visits: number;
}

const DemoSection = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const simInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [inputData, setInputData] = useState(sampleData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [aiInput, setAiInput] = useState("");

  const gridSize = 10; // 10x10 grid
  const cellSize = 100 / gridSize;

  const processData = useCallback(() => {
    setIsProcessing(true);
    
    // Parse the input data
    const lines = inputData.trim().split('\n');
    const grid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    
    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const x = parseInt(parts[0]);
        const y = parseInt(parts[1]);
        
        // Map to grid cell (0-100 range to 0-gridSize range)
        const gridX = Math.min(Math.floor(x / (100 / gridSize)), gridSize - 1);
        const gridY = Math.min(Math.floor(y / (100 / gridSize)), gridSize - 1);
        
        if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
          grid[gridY][gridX]++;
        }
      }
    });
    
    // Find max for normalization
    const maxVisits = Math.max(...grid.flat(), 1);
    
    // Convert to heatmap cells
    const cells: HeatmapCell[] = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        cells.push({
          x,
          y,
          visits: grid[y][x],
          intensity: grid[y][x] / maxVisits
        });
      }
    }
    
    // Animate the reveal
    setTimeout(() => {
      setHeatmapData(cells);
      setShowHeatmap(true);
      setIsProcessing(false);
    }, 500);
  }, [inputData, gridSize]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const heatmapOpacity = useTransform(scrollYProgress, [0.1, 0.32], [0, 1]);
  const heatmapLift = useTransform(scrollYProgress, [0.1, 0.32], [12, 0]);
  const actionOpacity = useTransform(scrollYProgress, [0.34, 0.56], [0, 1]);
  const actionLift = useTransform(scrollYProgress, [0.34, 0.56], [12, 0]);
  const arrowOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0, 1]);
  const typingOpacity = useTransform(scrollYProgress, [0.36, 0.52], [1, 0]);
  const typingHeight = useTransform(scrollYProgress, [0.36, 0.52], [16, 0]);
  const typingMargin = useTransform(scrollYProgress, [0.36, 0.52], [8, 0]);
  const suggestionOpacity = useTransform(scrollYProgress, [0.46, 0.62], [0, 1]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setShowHeatmap(value >= 0.12);
    setShowActionPlan(value >= 0.4);
  });

  useEffect(() => {
    if (!heatmapData.length && !isProcessing) {
      processData();
    }
  }, [heatmapData.length, isProcessing, processData]);

  const getHeatColor = (intensity: number): string => {
    if (intensity === 0) return 'hsl(210, 20%, 95%)';
    if (intensity < 0.25) return 'hsl(175, 80%, 70%)';
    if (intensity < 0.5) return 'hsl(175, 80%, 50%)';
    if (intensity < 0.75) return 'hsl(45, 90%, 55%)';
    return 'hsl(0, 75%, 55%)';
  };

  const getZoneLabel = (x: number, y: number): string => {
    if (y <= 1) return x <= 4 ? "Triage" : "Waiting";
    if (y <= 3) return x <= 6 ? "Exam" : "Supply";
    if (y === 4) return x <= 4 ? "Hallway" : "Nurse";
    if (y <= 6) return x <= 4 ? "Imaging" : "Lab";
    if (y === 7) return x <= 5 ? "Observation" : "Hallway";
    if (y >= 8) return x <= 4 ? "Discharge" : "Exit";
    return "Room";
  };

  const stats = useMemo(() => {
    if (!showHeatmap || heatmapData.length === 0) return null;
    
    const totalVisits = heatmapData.reduce((sum, cell) => sum + cell.visits, 0);
    const hotspots = heatmapData.filter(cell => cell.intensity > 0.5).length;
    const maxCell = heatmapData.reduce((max, cell) => cell.visits > max.visits ? cell : max, heatmapData[0]);
    
    return {
      totalVisits,
      hotspots,
      congestionZone: `(${maxCell.x + 1}, ${maxCell.y + 1})`,
    };
  }, [showHeatmap, heatmapData]);

  const actionInsights = useMemo(() => {
    if (!showHeatmap || heatmapData.length === 0) return [];
    const byZone = new Map<string, number>();
    heatmapData.forEach((cell) => {
      const label = getZoneLabel(cell.x, cell.y);
      byZone.set(label, (byZone.get(label) ?? 0) + cell.visits);
    });
    const ranked = [...byZone.entries()].sort((a, b) => b[1] - a[1]);
    const topZone = ranked[0]?.[0] ?? "Waiting";
    const secondZone = ranked[1]?.[0] ?? "Hallway";
    const thirdZone = ranked[2]?.[0] ?? "Observation";
    const waitingLoad = byZone.get("Waiting") ?? 0;
    const triageLoad = byZone.get("Triage") ?? 0;
    const hallwayLoad = byZone.get("Hallway") ?? 0;
    const imagingLoad = byZone.get("Imaging") ?? 0;
    const labLoad = byZone.get("Lab") ?? 0;
    const coldPressure = waitingLoad + triageLoad;
    const diagnosticsPressure = imagingLoad + labLoad;
    return [
      {
        title: "Common cold surge",
        bullets: [
          `Traffic concentrates around ${topZone} and ${secondZone}; move low-acuity rooms closer to Waiting/Triage.`,
          `Open a fast-track pod adjacent to ${topZone} so quick discharges bypass main lanes.`,
          `Stage overflow chair banks near the front door to absorb spikes without blocking flow.`,
        ],
      },
      {
        title: "Resource dissipation",
        bullets: [
          `Prioritize ${thirdZone} with float staff and mobile supplies to flatten peaks.`,
          `Route non-urgent labs toward ${secondZone} so diagnostics queue outside critical corridors.`,
          `Keep high-frequency touch points clustered to reduce backtracking and improve management visibility.`,
        ],
      },
      {
        title: "Hallway highways",
        bullets: [
          `With hallway load at ${hallwayLoad} visits, reserve a clean transit line for emergency moves.`,
          `Maintain a direct path between Waiting, Imaging, and Observation to reduce transfer time.`,
          `If diagnostics pressure stays high (${diagnosticsPressure} visits), shift cold carts toward Waiting and keep trauma lanes clear.`,
        ],
      },
    ];
  }, [showHeatmap, heatmapData]);

  const actionArrows = useMemo(() => {
    if (!showHeatmap || heatmapData.length === 0 || !showActionPlan) return [];
    const cellIndex = (x: number, y: number) => y * gridSize + x;
    const center = (x: number, y: number) => ({
      cx: x * cellSize + cellSize / 2,
      cy: y * cellSize + cellSize / 2,
    });
    const neighbors = (x: number, y: number) => {
      const offsets = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [1, -1], [-1, 1], [1, 1],
      ];
      return offsets
        .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
        .filter((pos) => pos.x >= 0 && pos.x < gridSize && pos.y >= 0 && pos.y < gridSize);
    };
    const pickLowest = (cells: HeatmapCell[]) =>
      cells.sort((a, b) => a.intensity - b.intensity)[0];
    const directionalTargets = (cell: HeatmapCell) => {
      const near = neighbors(cell.x, cell.y).map((pos) => heatmapData[cellIndex(pos.x, pos.y)]);
      const left = pickLowest(near.filter((c) => c.x < cell.x)) ?? null;
      const right = pickLowest(near.filter((c) => c.x > cell.x)) ?? null;
      const up = pickLowest(near.filter((c) => c.y < cell.y)) ?? null;
      const down = pickLowest(near.filter((c) => c.y > cell.y)) ?? null;
      const diag = pickLowest(near.filter((c) => c.x !== cell.x && c.y !== cell.y)) ?? null;
      return [left, right, up, down, diag].filter(Boolean) as HeatmapCell[];
    };
    const sorted = [...heatmapData]
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 4);
    const arrows: { path: string; key: string }[] = [];
    sorted.forEach((cell, index) => {
      const target = directionalTargets(cell)[0];
      if (!target) return;
      const start = center(cell.x, cell.y);
      const end = center(target.x, target.y);
      const useCurve = index % 2 === 0;
      const controlX = (start.cx + end.cx) / 2 + (start.cy - end.cy) * 0.15;
      const controlY = (start.cy + end.cy) / 2 + (end.cx - start.cx) * 0.15;
      const path = useCurve
        ? `M ${start.cx} ${start.cy} Q ${controlX} ${controlY} ${end.cx} ${end.cy}`
        : `M ${start.cx} ${start.cy} L ${end.cx} ${end.cy}`;
      arrows.push({
        path,
        key: `${cell.x}-${cell.y}-${target.x}-${target.y}`,
      });
    });
    return arrows;
  }, [cellSize, gridSize, heatmapData, showActionPlan, showHeatmap]);

  return (
    <section id="demo" ref={sectionRef} className="relative py-24 px-6 bg-secondary/30">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-accent font-medium text-sm uppercase tracking-wide">
            Interactive Demo
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-4">
            Transform data into insights
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Paste movement data, video feed, or simulation data to generate a congestion heatmap.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 grid gap-4 md:grid-cols-3"
        >
          {[
            { label: "Signal Sync", value: "Live + Sim" },
            { label: "Grid Resolution", value: "10x10 Cells" },
            { label: "Latency", value: "<1s Updates" },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-4"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(0_78%_55%)] to-transparent" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg">Movement Data</h3>
              <span className="text-xs text-muted-foreground">x, y, t, type</span>
            </div>
            
            <Textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="Enter data: x,y,timestamp,agent_type"
              className="h-80 font-mono text-sm bg-card border-border"
            />

            <div className="flex flex-wrap gap-3">
              <input ref={csvInputRef} type="file" accept=".csv" className="hidden" />
              <input ref={simInputRef} type="file" accept=".csv,.json" className="hidden" />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" />
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => csvInputRef.current?.click()}
              >
                Upload CSV sim
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => simInputRef.current?.click()}
              >
                Upload simulation
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => videoInputRef.current?.click()}
              >
                Upload video feed
              </Button>
            </div>
            
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Scroll to play the demo. Heatmap loads first, then action plan and routing.
            </div>
            {showHeatmap && (
              <motion.div
                style={{ opacity: actionOpacity, y: actionLift }}
                className="grid gap-3"
              >
                {actionInsights.map((insight, index) => (
                  <motion.div
                    key={insight.title}
                    style={{ opacity: actionOpacity, y: actionLift }}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {insight.title}
                    </p>
                    <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-foreground/80">
                      {insight.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Heatmap Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg">Congestion Heatmap</h3>
              {showHeatmap && (
                <Button variant="ghost" size="sm" className="text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              )}
            </div>

            {/* Heatmap Grid */}
            <motion.div
              className="relative bg-card rounded-xl border border-border p-4 aspect-square overflow-hidden"
              style={{ opacity: heatmapOpacity, y: heatmapLift }}
            >
              {/* Grid Background */}
              <div 
                className="absolute inset-4 rounded-lg overflow-hidden"
                style={{
                  backgroundImage: `
                    linear-gradient(hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
                  `,
                  backgroundSize: `${cellSize}% ${cellSize}%`
                }}
              />

              {/* Heatmap Cells */}
              <div className="absolute inset-4 grid grid-cols-10 gap-0.5 rounded-lg overflow-hidden">
                {showHeatmap && heatmapData.map((cell, index) => (
                  <motion.div
                    key={`${cell.x}-${cell.y}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.01, duration: 0.3 }}
                    className="aspect-square rounded-sm relative group cursor-pointer"
                    style={{ backgroundColor: getHeatColor(cell.intensity) }}
                  >
                    <span className="absolute inset-0 flex items-end justify-start p-1 text-[8px] font-medium text-foreground/70 leading-none">
                      {getZoneLabel(cell.x, cell.y)}
                    </span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Cell ({cell.x + 1}, {cell.y + 1}): {cell.visits} visits
                    </div>
                  </motion.div>
                ))}

                {/* Empty State */}
                {!showHeatmap && (
                  <div className="col-span-10 row-span-10 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm">Click "Generate Heatmap" to visualize</p>
                    </div>
                  </div>
                )}
              </div>

              {showHeatmap && (
                <svg
                  className="absolute inset-4 pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="4"
                      markerHeight="4"
                      refX="3.5"
                      refY="2"
                      orient="auto"
                    >
                      <path d="M 0 0 L 4 2 L 0 4 z" fill="hsl(0 0% 10% / 0.8)" />
                    </marker>
                  </defs>
                  {showActionPlan && (
                    <motion.g style={{ opacity: arrowOpacity }}>
                      {actionArrows.map((arrow, index) => (
                        <motion.path
                          key={arrow.key}
                          d={arrow.path}
                          fill="none"
                          stroke="hsl(0 0% 10% / 0.6)"
                          strokeWidth="0.9"
                          markerEnd="url(#arrowhead)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.05 * index }}
                        />
                      ))}
                    </motion.g>
                  )}
                </svg>
              )}

              {/* Axis Labels */}
              <div className="absolute left-0 top-4 bottom-4 w-4 flex flex-col justify-between text-[10px] text-muted-foreground">
                <span>100</span>
                <span>50</span>
                <span>0</span>
              </div>
              <div className="absolute bottom-0 left-4 right-4 h-4 flex justify-between text-[10px] text-muted-foreground">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </motion.div>

            {/* Legend & Stats */}
            {showHeatmap && stats && (
              <motion.div
                style={{ opacity: heatmapOpacity, y: heatmapLift }}
                className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card rounded-lg border border-border"
              >
                {/* Color Legend */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Low</span>
                  <div className="flex gap-0.5">
                    {['hsl(175, 80%, 70%)', 'hsl(175, 80%, 50%)', 'hsl(45, 90%, 55%)', 'hsl(0, 75%, 55%)'].map((color, i) => (
                      <div key={i} className="w-6 h-4 rounded-sm" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">High</span>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Points: </span>
                    <span className="font-semibold">{stats.totalVisits}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hotspots: </span>
                    <span className="font-semibold text-destructive">{stats.hotspots}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Peak: </span>
                    <span className="font-semibold">{stats.congestionZone}</span>
                  </div>
                </div>
              </motion.div>
            )}
            {showHeatmap && (
              <motion.div
                style={{ opacity: actionOpacity, y: actionLift }}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    LLM Assistance
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add context for the action plan. The assistant will adapt staffing, routing,
                  and room placement recommendations.
                </p>
                <Textarea
                  value={aiInput}
                  onChange={(event) => setAiInput(event.target.value)}
                  placeholder="Example: flu clinic overflow starts at 2 PM; imaging backlog is 20 mins; hallway C must stay clear."
                  className="mt-3 min-h-[110px] bg-background"
                />
                <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <motion.div
                    style={{ opacity: typingOpacity, height: typingHeight, marginBottom: typingMargin }}
                    className="flex items-center gap-2 overflow-hidden"
                  >
                    <span className="font-medium text-foreground/80">Assistant</span>
                    <span>Analyzing and drafting updates</span>
                    <span className="inline-flex gap-1">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-foreground/60" />
                      <span className="h-1 w-1 animate-pulse rounded-full bg-foreground/60" />
                      <span className="h-1 w-1 animate-pulse rounded-full bg-foreground/60" />
                    </span>
                  </motion.div>
                  <motion.div style={{ opacity: suggestionOpacity }}>
                    <span className="font-medium text-foreground/80">Recommendation:</span>{" "}
                    Move overflow triage closer to Waiting after 2 PM, re-route imaging queues
                    through Hallway C, and cluster common cold rooms near the fast-track pod to
                    keep emergency lanes clear.
                  </motion.div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default DemoSection;
