import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Trash2, Plus, Lock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import type { SimulationConfig } from "@/components/HeatmapSimulation";

// Cell types matching the simulation engine
const CELL_TYPES = {
  WALL: -2,
  SPAWN: -1,
  EMPTY: 0,
  WAITING: 1,
  LOW_SEVERITY: 4,
  HIGH_SEVERITY: 5,
} as const;

type CellType = (typeof CELL_TYPES)[keyof typeof CELL_TYPES];

// Editable cell types (excludes spawn and waiting which are locked)
type EditableCellType = typeof CELL_TYPES.WALL | typeof CELL_TYPES.EMPTY | typeof CELL_TYPES.LOW_SEVERITY | typeof CELL_TYPES.HIGH_SEVERITY;

interface CellInfo {
  label: string;
  color: string;
  description: string;
}

// All cell type info for display
const CELL_TYPE_INFO: Record<CellType, CellInfo> = {
  [CELL_TYPES.WALL]: {
    label: "Wall",
    color: "#2C3E50",
    description: "Impassable boundary",
  },
  [CELL_TYPES.SPAWN]: {
    label: "Spawn Point",
    color: "#95A5A6",
    description: "Patient entry point (locked)",
  },
  [CELL_TYPES.EMPTY]: {
    label: "Empty",
    color: "#ECF0F1",
    description: "Walkable corridor space",
  },
  [CELL_TYPES.WAITING]: {
    label: "Waiting Room",
    color: "#F39C12",
    description: "Patient queue area (locked)",
  },
  [CELL_TYPES.LOW_SEVERITY]: {
    label: "Low-Severity Room",
    color: "#3498DB",
    description: "Treatment room for minor ailments",
  },
  [CELL_TYPES.HIGH_SEVERITY]: {
    label: "High-Severity Room",
    color: "#E74C3C",
    description: "Treatment room for critical care",
  },
};

// Only these cell types are available for placement
const EDITABLE_CELL_TYPES: EditableCellType[] = [
  CELL_TYPES.EMPTY,
  CELL_TYPES.WALL,
  CELL_TYPES.LOW_SEVERITY,
  CELL_TYPES.HIGH_SEVERITY,
];

// Staff placement info
interface StaffPlacement {
  nurses: number;
  doctors: number;
}

type Position = [number, number];

// Simple A* pathfinding to check reachability (matches simulation logic)
function canReach(grid: number[][], start: Position, end: Position): boolean {
  const rows = grid.length;
  const cols = grid[0].length;

  const posKey = (pos: Position) => `${pos[0]},${pos[1]}`;
  const posEqual = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1];

  const openSet: Position[] = [start];
  const visited = new Set<string>();
  visited.add(posKey(start));

  const directions: Position[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (openSet.length > 0) {
    const curr = openSet.shift()!;

    if (posEqual(curr, end)) {
      return true;
    }

    for (const d of directions) {
      const neighbor: Position = [curr[0] + d[0], curr[1] + d[1]];

      // Bounds check
      if (neighbor[0] < 0 || neighbor[0] >= rows || neighbor[1] < 0 || neighbor[1] >= cols) {
        continue;
      }

      const key = posKey(neighbor);
      if (visited.has(key)) continue;

      const cellValue = grid[neighbor[0]][neighbor[1]];

      // Skip walls
      if (cellValue === CELL_TYPES.WALL) continue;

      // Skip spawn/treatment rooms unless destination (matches simulation A*)
      if ((cellValue === CELL_TYPES.SPAWN || cellValue === CELL_TYPES.LOW_SEVERITY || cellValue === CELL_TYPES.HIGH_SEVERITY) && !posEqual(neighbor, end)) {
        continue;
      }

      visited.add(key);
      openSet.push(neighbor);
    }
  }

  return false;
}

const HospitalLayoutBuilder = () => {
  const navigate = useNavigate();

  // Grid dimensions
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);

  // Grid state - initialize with walls on perimeter and empty inside
  const [grid, setGrid] = useState<number[][]>(() => createInitialGrid(5, 6));

  // Staff placements - keyed by "row,col"
  const [staffPlacements, setStaffPlacements] = useState<Map<string, StaffPlacement>>(new Map());

  // Currently selected cell type for painting (only editable types)
  const [selectedCellType, setSelectedCellType] = useState<EditableCellType>(CELL_TYPES.EMPTY);

  // Staff placement mode
  const [staffMode, setStaffMode] = useState<"none" | "nurse" | "doctor">("none");

  // Validation errors
  const [errors, setErrors] = useState<string[]>([]);

  // Create initial grid with walls on perimeter
  function createInitialGrid(r: number, c: number): number[][] {
    const newGrid: number[][] = [];
    for (let i = 0; i < r; i++) {
      const row: number[] = [];
      for (let j = 0; j < c; j++) {
        // Walls on perimeter, empty inside
        if (i === 0 || i === r - 1 || j === 0 || j === c - 1) {
          row.push(CELL_TYPES.WALL);
        } else {
          row.push(CELL_TYPES.EMPTY);
        }
      }
      newGrid.push(row);
    }
    // Add default spawn point at top-left
    newGrid[0][0] = CELL_TYPES.SPAWN;
    // Add default waiting room next to spawn
    if (c > 1) newGrid[0][1] = CELL_TYPES.WAITING;
    return newGrid;
  }

  // Handle dimension changes
  const handleRowsChange = useCallback((value: number[]) => {
    const newRows = value[0];
    setRows(newRows);
    setGrid(createInitialGrid(newRows, cols));
    setStaffPlacements(new Map());
  }, [cols]);

  const handleColsChange = useCallback((value: number[]) => {
    const newCols = value[0];
    setCols(newCols);
    setGrid(createInitialGrid(rows, newCols));
    setStaffPlacements(new Map());
  }, [rows]);

  // Handle cell click
  const handleCellClick = useCallback((r: number, c: number) => {
    const cellValue = grid[r][c];

    // Spawn and waiting room are locked - cannot be edited
    if (cellValue === CELL_TYPES.SPAWN || cellValue === CELL_TYPES.WAITING) {
      return;
    }

    if (staffMode !== "none") {
      // Staff placement mode
      const key = `${r},${c}`;
      const current = staffPlacements.get(key) || { nurses: 0, doctors: 0 };

      // Only allow staff on empty cells or treatment rooms
      if (cellValue !== CELL_TYPES.EMPTY && cellValue !== CELL_TYPES.LOW_SEVERITY && cellValue !== CELL_TYPES.HIGH_SEVERITY) {
        return;
      }

      if (staffMode === "nurse") {
        setStaffPlacements(new Map(staffPlacements.set(key, { ...current, nurses: current.nurses + 1 })));
      } else if (staffMode === "doctor") {
        setStaffPlacements(new Map(staffPlacements.set(key, { ...current, doctors: current.doctors + 1 })));
      }
    } else {
      // Cell type painting mode
      setGrid(prev => {
        const newGrid = prev.map(row => [...row]);
        newGrid[r][c] = selectedCellType;
        return newGrid;
      });

      // Clear staff from this cell if it's not a valid placement anymore
      if (selectedCellType !== CELL_TYPES.EMPTY && selectedCellType !== CELL_TYPES.LOW_SEVERITY && selectedCellType !== CELL_TYPES.HIGH_SEVERITY) {
        const key = `${r},${c}`;
        if (staffPlacements.has(key)) {
          const newPlacements = new Map(staffPlacements);
          newPlacements.delete(key);
          setStaffPlacements(newPlacements);
        }
      }
    }
  }, [grid, selectedCellType, staffMode, staffPlacements]);

  // Remove staff from a cell
  const handleRemoveStaff = useCallback((r: number, c: number, type: "nurse" | "doctor") => {
    const key = `${r},${c}`;
    const current = staffPlacements.get(key);
    if (!current) return;

    if (type === "nurse" && current.nurses > 0) {
      const newPlacement = { ...current, nurses: current.nurses - 1 };
      if (newPlacement.nurses === 0 && newPlacement.doctors === 0) {
        const newPlacements = new Map(staffPlacements);
        newPlacements.delete(key);
        setStaffPlacements(newPlacements);
      } else {
        setStaffPlacements(new Map(staffPlacements.set(key, newPlacement)));
      }
    } else if (type === "doctor" && current.doctors > 0) {
      const newPlacement = { ...current, doctors: current.doctors - 1 };
      if (newPlacement.nurses === 0 && newPlacement.doctors === 0) {
        const newPlacements = new Map(staffPlacements);
        newPlacements.delete(key);
        setStaffPlacements(newPlacements);
      } else {
        setStaffPlacements(new Map(staffPlacements.set(key, newPlacement)));
      }
    }
  }, [staffPlacements]);

  // Validate and generate config
  const validateAndGenerateConfig = useCallback((): SimulationConfig | null => {
    const validationErrors: string[] = [];

    // Find spawn point
    let spawnPoint: [number, number] | null = null;
    let waitingRoom: [number, number] | null = null;
    const lowSeverityRooms: [number, number][] = [];
    const highSeverityRooms: [number, number][] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        if (cell === CELL_TYPES.SPAWN) {
          spawnPoint = [r, c];
        } else if (cell === CELL_TYPES.WAITING) {
          waitingRoom = [r, c];
        } else if (cell === CELL_TYPES.LOW_SEVERITY) {
          lowSeverityRooms.push([r, c]);
        } else if (cell === CELL_TYPES.HIGH_SEVERITY) {
          highSeverityRooms.push([r, c]);
        }
      }
    }

    // Validation checks (spawn and waiting are always present and adjacent at [0,0] and [0,1])
    if (lowSeverityRooms.length === 0) {
      validationErrors.push("At least one low-severity room is required");
    }
    if (highSeverityRooms.length === 0) {
      validationErrors.push("At least one high-severity room is required");
    }

    // Check that all treatment rooms are reachable from the waiting room
    const waitingRoomPos: Position = [0, 1];
    const unreachableRooms: string[] = [];

    for (const room of lowSeverityRooms) {
      if (!canReach(grid, waitingRoomPos, room)) {
        unreachableRooms.push(`Low-severity room at (${room[0]}, ${room[1]})`);
      }
    }

    for (const room of highSeverityRooms) {
      if (!canReach(grid, waitingRoomPos, room)) {
        unreachableRooms.push(`High-severity room at (${room[0]}, ${room[1]})`);
      }
    }

    if (unreachableRooms.length > 0) {
      validationErrors.push(`Unreachable rooms: ${unreachableRooms.join(", ")}. Ensure corridors connect all rooms.`);
    }

    // Check that staff positions are reachable from the waiting room
    const unreachableStaff: string[] = [];
    staffPlacements.forEach((placement, key) => {
      const [r, c] = key.split(",").map(Number);
      const staffPos: Position = [r, c];
      // Staff are on empty cells, so we check if waiting room can reach that cell
      // We need to temporarily treat the staff position as a valid destination
      if (!canReach(grid, waitingRoomPos, staffPos)) {
        if (placement.nurses > 0) {
          unreachableStaff.push(`Nurse(s) at (${r}, ${c})`);
        }
        if (placement.doctors > 0) {
          unreachableStaff.push(`Doctor(s) at (${r}, ${c})`);
        }
      }
    });

    if (unreachableStaff.length > 0) {
      validationErrors.push(`Unreachable staff: ${unreachableStaff.join(", ")}. Staff must be on connected corridors.`);
    }

    // Count total staff
    let totalNurses = 0;
    let totalDoctors = 0;
    const nursePositions: [number, number][] = [];
    const doctorPositions: [number, number][] = [];

    staffPlacements.forEach((placement, key) => {
      const [r, c] = key.split(",").map(Number);
      for (let i = 0; i < placement.nurses; i++) {
        nursePositions.push([r, c]);
        totalNurses++;
      }
      for (let i = 0; i < placement.doctors; i++) {
        doctorPositions.push([r, c]);
        totalDoctors++;
      }
    });

    if (totalNurses === 0) {
      validationErrors.push("At least one nurse is required");
    }

    if (totalDoctors === 0) {
      validationErrors.push("At least one doctor is required");
    }

    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      return null;
    }

    // Build the config - the hospital grid already has the correct cell values
    return {
      hospital: grid,
      lowSeverityRooms,
      highSeverityRooms,
      nursePositions: nursePositions.length > 0 ? nursePositions : undefined,
      doctorPositions: doctorPositions.length > 0 ? doctorPositions : undefined,
    };
  }, [grid, rows, cols, staffPlacements]);

  // Generate and run simulation - save to localStorage and navigate to dashboard
  const handleRunSimulation = useCallback(() => {
    const config = validateAndGenerateConfig();
    if (config) {
      // Save config to localStorage so dashboard can use it
      localStorage.setItem("atria:customSimulationConfig", JSON.stringify(config));
      // Navigate to dashboard
      navigate("/dashboard");
    }
  }, [validateAndGenerateConfig, navigate]);

  // Reset the builder
  const handleReset = useCallback(() => {
    setGrid(createInitialGrid(rows, cols));
    setStaffPlacements(new Map());
    setErrors([]);
  }, [rows, cols]);

  // Download layout
  const handleDownload = useCallback(() => {
    const config = validateAndGenerateConfig();
    if (!config) {
      return; // Validation errors will be shown
    }

    // Build the text file content
    const lines: string[] = [];

    // Line 1: rows and cols
    lines.push(`${rows} ${cols}`);

    // Next rows lines: grid data (convert room cells to 0)
    grid.forEach(row => {
      const convertedRow = row.map(cell => {
        // Convert room cells (4 = low severity, 5 = high severity) to 0 (empty)
        if (cell === CELL_TYPES.LOW_SEVERITY || cell === CELL_TYPES.HIGH_SEVERITY) {
          return 0;
        }
        return cell;
      });
      lines.push(convertedRow.join(' '));
    });

    // Low severity rooms
    lines.push(config.lowSeverityRooms.length.toString());
    config.lowSeverityRooms.forEach(([r, c]) => {
      lines.push(`${r} ${c}`);
    });

    // High severity rooms
    lines.push(config.highSeverityRooms.length.toString());
    config.highSeverityRooms.forEach(([r, c]) => {
      lines.push(`${r} ${c}`);
    });

    // Nurses
    const nursePositions = config.nursePositions || [];
    lines.push(nursePositions.length.toString());
    nursePositions.forEach(([r, c]) => {
      lines.push(`${r} ${c}`);
    });

    // Doctors
    const doctorPositions = config.doctorPositions || [];
    lines.push(doctorPositions.length.toString());
    doctorPositions.forEach(([r, c]) => {
      lines.push(`${r} ${c}`);
    });

    // Create and download file
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital_layout_${rows}x${cols}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rows, cols, grid, validateAndGenerateConfig]);

  // Calculate staff totals
  const staffTotals = useMemo(() => {
    let nurses = 0;
    let doctors = 0;
    staffPlacements.forEach(placement => {
      nurses += placement.nurses;
      doctors += placement.doctors;
    });
    return { nurses, doctors };
  }, [staffPlacements]);

  // Count room types
  const roomCounts = useMemo(() => {
    let low = 0;
    let high = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell === CELL_TYPES.LOW_SEVERITY) low++;
        if (cell === CELL_TYPES.HIGH_SEVERITY) high++;
      }
    }
    return { low, high };
  }, [grid]);

  return (
    <main className="dark relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 hospital-landing" />
        <div className="absolute inset-0 bg-slate-950/70" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4 text-white hover:bg-slate-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">
            Build Your Own Hospital Layout
          </h1>
          <p className="mt-2 text-muted-foreground">
            Design a custom hospital floor plan and run simulations to analyze patient flow
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Grid Editor */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Hospital Grid Editor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Dimension Sliders */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Rows: {rows}</Label>
                      <Slider
                        value={[rows]}
                        onValueChange={handleRowsChange}
                        min={3}
                        max={12}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Columns: {cols}</Label>
                      <Slider
                        value={[cols]}
                        onValueChange={handleColsChange}
                        min={3}
                        max={12}
                        step={1}
                      />
                    </div>
                  </div>

                  {/* Grid Display */}
                  <div className="overflow-x-auto">
                    <div
                      className="inline-grid gap-1 rounded-lg border border-border/60 bg-muted/20 p-4"
                      style={{
                        gridTemplateColumns: `repeat(${cols}, 50px)`,
                      }}
                    >
                      {grid.map((row, r) =>
                        row.map((cellValue, c) => {
                          const cellInfo = CELL_TYPE_INFO[cellValue as CellType];
                          const staff = staffPlacements.get(`${r},${c}`);
                          const hasStaff = staff && (staff.nurses > 0 || staff.doctors > 0);
                          const isLocked = cellValue === CELL_TYPES.SPAWN || cellValue === CELL_TYPES.WAITING;

                          return (
                            <div
                              key={`${r}-${c}`}
                              onClick={() => handleCellClick(r, c)}
                              className={`relative flex h-[50px] w-[50px] items-center justify-center rounded border border-gray-400/50 text-[9px] font-bold transition-transform ${
                                isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:scale-105"
                              }`}
                              style={{
                                backgroundColor: cellInfo?.color || "#ECF0F1",
                                color: cellValue === CELL_TYPES.WALL || cellValue === CELL_TYPES.HIGH_SEVERITY ? "white" : "black",
                              }}
                              title={isLocked ? `${cellInfo?.label} (locked)` : cellInfo?.description}
                            >
                              <span className="text-center leading-tight">
                                {cellInfo?.label.split(" ")[0] || "?"}
                              </span>

                              {/* Lock indicator for spawn and waiting */}
                              {isLocked && (
                                <div className="absolute -top-1 -left-1">
                                  <Lock className="h-3 w-3 text-gray-600" />
                                </div>
                              )}

                              {/* Staff indicators */}
                              {hasStaff && (
                                <div className="absolute -top-1 -right-1 flex gap-0.5">
                                  {staff.nurses > 0 && (
                                    <div
                                      className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[8px] font-bold text-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveStaff(r, c, "nurse");
                                      }}
                                      title={`${staff.nurses} nurse(s) - click to remove`}
                                    >
                                      {staff.nurses}
                                    </div>
                                  )}
                                  {staff.doctors > 0 && (
                                    <div
                                      className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveStaff(r, c, "doctor");
                                      }}
                                      title={`${staff.doctors} doctor(s) - click to remove`}
                                    >
                                      {staff.doctors}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Errors */}
                  {errors.length > 0 && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                      <p className="font-semibold text-red-600">Validation Errors:</p>
                      <ul className="mt-2 list-disc pl-5 text-sm text-red-600">
                        {errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleRunSimulation}>
                      <Play className="mr-2 h-4 w-4" />
                      Run Simulation
                    </Button>
                    <Button variant="outline" onClick={handleDownload}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Layout
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Reset Layout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Controls Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="space-y-4"
            >
              {/* Cell Type Selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Cell Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Select a cell type and click on the grid to place it. Spawn and waiting room are fixed at top-left.
                  </p>
                  {EDITABLE_CELL_TYPES.map((cellType) => {
                    const info = CELL_TYPE_INFO[cellType];
                    const isSelected = selectedCellType === cellType && staffMode === "none";

                    return (
                      <button
                        key={cellType}
                        onClick={() => {
                          setSelectedCellType(cellType);
                          setStaffMode("none");
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                          isSelected
                            ? "border-foreground bg-foreground/10"
                            : "border-border/60 hover:border-foreground/50"
                        }`}
                      >
                        <div
                          className="h-6 w-6 rounded border border-gray-400/50"
                          style={{ backgroundColor: info.color }}
                        />
                        <div>
                          <p className="text-sm font-medium">{info.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {info.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Staff Placement */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Staff Placement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Select a staff type and click on empty cells or treatment rooms to place them
                  </p>

                  <button
                    onClick={() => {
                      setStaffMode(staffMode === "nurse" ? "none" : "nurse");
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                      staffMode === "nurse"
                        ? "border-green-500 bg-green-500/10"
                        : "border-border/60 hover:border-green-500/50"
                    }`}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                      <Plus className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Add Nurse</p>
                      <p className="text-[10px] text-muted-foreground">
                        Total: {staffTotals.nurses}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setStaffMode(staffMode === "doctor" ? "none" : "doctor");
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                      staffMode === "doctor"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-border/60 hover:border-purple-500/50"
                    }`}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
                      <Plus className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Add Doctor</p>
                      <p className="text-[10px] text-muted-foreground">
                        Total: {staffTotals.doctors}
                      </p>
                    </div>
                  </button>

                  <p className="text-[10px] text-muted-foreground mt-2">
                    Click staff badges on grid cells to remove them
                  </p>
                </CardContent>
              </Card>

              {/* Layout Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Layout Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Grid Size:</span>
                      <span className="font-medium">{rows} x {cols}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Low-Severity Rooms:</span>
                      <span className="font-medium">{roomCounts.low}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">High-Severity Rooms:</span>
                      <span className="font-medium">{roomCounts.high}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nurses:</span>
                      <span className="font-medium text-green-600">{staffTotals.nurses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Doctors:</span>
                      <span className="font-medium text-purple-600">{staffTotals.doctors}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
      </div>
    </main>
  );
};

export default HospitalLayoutBuilder;
