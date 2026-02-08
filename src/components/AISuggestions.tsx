import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SimulationResults } from "./HeatmapSimulation";

interface AISuggestionsProps {
  standardResults: SimulationResults | null;
  mciResults: SimulationResults | null;
}

export function AISuggestions({ standardResults, mciResults }: AISuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!standardResults || !mciResults) return null;

  const buildPrompt = () => {
    const { hospital, avgCongestionGrid, anomalyResults, simState } = standardResults;
    const mciCongestionGrid = mciResults.avgCongestionGrid;
    const mciAnomalyResults = mciResults.anomalyResults;

    if (!simState) return "";

    const rows = hospital.length;
    const cols = hospital[0]?.length ?? 0;

    // Extract key locations
    const spawnPoint = simState.spawnPoint;
    const waitingRoomPos = simState.waitingRoomPos;

    // Get treatment rooms
    const lowSeverityRooms: Array<{ position: [number, number]; severity_type: number }> = [];
    const highSeverityRooms: Array<{ position: [number, number]; severity_type: number }> = [];

    simState.treatmentRooms.forEach((info, key) => {
      const [r, c] = key.split(",").map(Number);
      const pos: [number, number] = [r, c];
      const roomData = { position: pos, severity_type: info.severityType };
      if (info.severityType === 0) {
        lowSeverityRooms.push(roomData);
      } else {
        highSeverityRooms.push(roomData);
      }
    });

    // Get staff positions
    const nurseIdlePositions = simState.nurses.map(n => n.idlePosition);
    const doctorIdlePositions = simState.doctors.map(d => d.idlePosition);

    // Extract congestion anomalies from BOTH simulations
    let standardCongestedPoints: Array<{ row: number; col: number; congestion: number }> = [];
    let mciCongestedPoints: Array<{ row: number; col: number; congestion: number }> = [];

    // Standard simulation congestion
    if (anomalyResults?.anomalies?.highCongestion) {
      standardCongestedPoints = anomalyResults.anomalies.highCongestion
        .sort((a, b) => b.congestion - a.congestion)
        .slice(0, 10);
    }

    // MCI simulation congestion
    if (mciAnomalyResults?.anomalies?.highCongestion) {
      mciCongestedPoints = mciAnomalyResults.anomalies.highCongestion
        .sort((a, b) => b.congestion - a.congestion)
        .slice(0, 10);
    }

    // If no anomalies found for standard, get top congestion cells manually
    if (standardCongestedPoints.length === 0) {
      const flatCongestion: Array<{ row: number; col: number; congestion: number }> = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (avgCongestionGrid[r][c] > 0) {
            flatCongestion.push({ row: r, col: c, congestion: avgCongestionGrid[r][c] });
          }
        }
      }
      flatCongestion.sort((a, b) => b.congestion - a.congestion);
      standardCongestedPoints = flatCongestion.slice(0, 10);
    }

    // If no anomalies found for MCI, get top congestion cells manually
    if (mciCongestedPoints.length === 0) {
      const flatCongestion: Array<{ row: number; col: number; congestion: number }> = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (mciCongestionGrid[r][c] > 0) {
            flatCongestion.push({ row: r, col: c, congestion: mciCongestionGrid[r][c] });
          }
        }
      }
      flatCongestion.sort((a, b) => b.congestion - a.congestion);
      mciCongestedPoints = flatCongestion.slice(0, 10);
    }

    // Build the prompt
    const promptLines = [
      "=".repeat(70),
      "AI PROMPT: ER HOSPITAL SETUP IMPROVEMENT REQUEST",
      "=".repeat(70),
      "",
      "You are an expert in emergency room operations and hospital layout optimization.",
      "Analyze the following hospital simulation setup and congestion data from BOTH standard",
      "and mass casualty incident (MCI) scenarios, then suggest improvements to reduce",
      "bottlenecks and improve patient flow under both normal and surge conditions.",
      "",
      "IMPORTANT: Provide a DETAILED but CONCISE response. Use clear formatting with headers,",
      "bullet points, and numbered lists. Focus on actionable recommendations that work for",
      "BOTH standard operations AND surge/MCI scenarios.",
      "",
      "-".repeat(70),
      "HOSPITAL LAYOUT",
      "-".repeat(70),
      `Grid dimensions: ${rows} rows x ${cols} columns`,
      "",
      "Grid encoding:",
      "  -2 = Wall (impassable)",
      "  -1 = Spawn point",
      "   0 = Free space (walkable corridor)",
      "   1 = Waiting room",
      "   4 = Low severity treatment room",
      "   5 = High severity treatment room",
      "",
      "Hospital grid:",
    ];

    hospital.forEach((row, r) => {
      promptLines.push(`  Row ${r}: [${row.join(", ")}]`);
    });

    promptLines.push(
      "",
      "-".repeat(70),
      "KEY LOCATIONS",
      "-".repeat(70),
      `Spawn point (patient entry): (${spawnPoint[0]}, ${spawnPoint[1]})`,
      `Waiting room: (${waitingRoomPos[0]}, ${waitingRoomPos[1]})`,
      "",
      `Nurse idle positions (${nurseIdlePositions.length} nurses): ${JSON.stringify(nurseIdlePositions)}`,
      `Doctor idle positions (${doctorIdlePositions.length} doctors): ${JSON.stringify(doctorIdlePositions)}`,
      "",
      `LOW SEVERITY treatment rooms (${lowSeverityRooms.length}):`
    );

    lowSeverityRooms.forEach(room => {
      promptLines.push(`  - Position: (${room.position[0]}, ${room.position[1]})`);
    });

    promptLines.push(`\nHIGH SEVERITY treatment rooms (${highSeverityRooms.length}):`);
    highSeverityRooms.forEach(room => {
      promptLines.push(`  - Position: (${room.position[0]}, ${room.position[1]})`);
    });

    // Calculate statistics for BOTH simulations
    const maxStandardCongestion = Math.max(...avgCongestionGrid.flat());
    const avgStandardFlat = avgCongestionGrid.flat();
    const meanStandardCongestion = avgStandardFlat.reduce((a, b) => a + b, 0) / avgStandardFlat.length;

    const maxMCICongestion = Math.max(...mciCongestionGrid.flat());
    const avgMCIFlat = mciCongestionGrid.flat();
    const meanMCICongestion = avgMCIFlat.reduce((a, b) => a + b, 0) / avgMCIFlat.length;

    promptLines.push(
      "",
      "-".repeat(70),
      "CONGESTION ANALYSIS - STANDARD SIMULATION",
      "-".repeat(70),
      `Total grid cells analyzed: ${rows * cols}`,
      `Max congestion: ${maxStandardCongestion.toFixed(4)}`,
      `Mean congestion: ${meanStandardCongestion.toFixed(4)}`,
      "",
      "Top congestion hotspots (potential bottlenecks):"
    );

    standardCongestedPoints.forEach((point, i) => {
      promptLines.push(`  ${i + 1}. Grid position (${point.row}, ${point.col}): congestion = ${point.congestion.toFixed(4)}`);
    });

    promptLines.push(
      "",
      "-".repeat(70),
      "CONGESTION ANALYSIS - MCI/SURGE SIMULATION",
      "-".repeat(70),
      `Total grid cells analyzed: ${rows * cols}`,
      `Max congestion: ${maxMCICongestion.toFixed(4)}`,
      `Mean congestion: ${meanMCICongestion.toFixed(4)}`,
      "",
      "Top congestion hotspots during MCI (potential bottlenecks under surge):"
    );

    mciCongestedPoints.forEach((point, i) => {
      promptLines.push(`  ${i + 1}. Grid position (${point.row}, ${point.col}): congestion = ${point.congestion.toFixed(4)}`);
    });

    promptLines.push(
      "",
      "-".repeat(70),
      "COMPARISON & INSIGHTS",
      "-".repeat(70),
      `Congestion increase from Standard to MCI: ${((maxMCICongestion / maxStandardCongestion - 1) * 100).toFixed(1)}%`,
      `Mean congestion increase: ${((meanMCICongestion / meanStandardCongestion - 1) * 100).toFixed(1)}%`,
      "",
      "-".repeat(70),
      "REQUEST",
      "-".repeat(70),
      "Based on this hospital setup and congestion data from BOTH simulations, please provide:",
      "",
      "1. BOTTLENECK DIAGNOSIS:",
      "   - What are the likely causes of congestion at the identified hotspots?",
      "   - How does the current layout contribute to these bottlenecks?",
      "   - Which bottlenecks are worse during MCI/surge scenarios?",
      "",
      "2. LAYOUT IMPROVEMENTS:",
      "   - Suggest specific changes to room positions or corridor layout",
      "   - Recommend optimal placement for treatment rooms relative to spawn/waiting",
      "   - Prioritize changes that help BOTH standard and surge scenarios",
      "",
      "3. STAFFING RECOMMENDATIONS:",
      "   - Should nurse/doctor positions be adjusted?",
      "   - Are there enough staff for standard vs. MCI patient flow?",
      "   - Surge staffing strategy recommendations",
      "",
      "4. OPERATIONAL CHANGES:",
      "   - Routing improvements for patient flow",
      "   - Queue management suggestions",
      "   - MCI activation protocols and workflow changes",
      "",
      "5. SURGE PREPAREDNESS:",
      "   - How well does this layout handle surge scenarios?",
      "   - What are the critical failure points during MCI?",
      "   - Recommendations for scalable capacity",
      "",
      "=" + "=".repeat(69),
    );

    return promptLines.join("\n");
  };

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file.");
      }

      const promptText = buildPrompt();

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: promptText,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4000,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to fetch suggestions from Gemini API");
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error("No suggestions generated");
      }

      setSuggestions(generatedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full border-emerald-300/30 bg-gradient-to-br from-emerald-300/10 via-slate-900/70 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-300">
          <span>💡</span> AI-Powered Layout Improvement Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!suggestions && !isLoading && !error && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Both simulations have completed successfully. Click the button below to generate
              AI-powered suggestions for improving your ER layout and operations using Google Gemini.
              The analysis will consider performance under both standard and surge/MCI scenarios.
            </p>
            <Button
              onClick={fetchSuggestions}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
            >
              Generate AI Suggestions
            </Button>
          </>
        )}

        {isLoading && (
          <div className="flex items-center gap-3 py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-emerald-300 border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Analyzing both simulations with Gemini AI... This may take a moment.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400 font-semibold mb-2">Error</p>
            <p className="text-xs text-red-400">{error}</p>
            <Button
              onClick={fetchSuggestions}
              variant="outline"
              className="mt-3 border-red-500/50 hover:bg-red-500/20"
              size="sm"
            >
              Try Again
            </Button>
          </div>
        )}

        {suggestions && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-800/50 border border-emerald-300/20 p-6 overflow-auto max-h-[600px]">
              <div
                className="prose prose-sm max-w-none prose-invert prose-headings:text-emerald-300 prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm prose-p:text-slate-200 prose-li:text-slate-200 prose-li:my-1 prose-code:text-emerald-300 prose-code:bg-slate-900/50 prose-pre:bg-slate-900 prose-strong:text-emerald-200 prose-strong:font-semibold prose-ul:my-2 prose-ol:my-2"
                dangerouslySetInnerHTML={{
                  __html: suggestions
                    // Clean up extra line breaks and whitespace
                    .replace(/\n{3,}/g, '\n\n')
                    .trim()
                    // Convert headers (must be done before other replacements)
                    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
                    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                    // Convert bold and italic
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    // Convert inline code
                    .replace(/`(.+?)`/g, '<code>$1</code>')
                    // Handle lists with newlines between items
                    .replace(/\n(?=[*-]\s)/g, '\n\n')
                    .replace(/\n(?=\d+\.\s)/g, '\n\n')
                    // Convert lists - handle both bullet and numbered
                    .split('\n\n')
                    .map(block => {
                      // Check if block is a list
                      if (block.match(/^[-*]\s/m)) {
                        return '<ul class="space-y-1">' + block.replace(/^[-*]\s+(.+)$/gm, '<li class="my-1">$1</li>') + '</ul>';
                      } else if (block.match(/^\d+\.\s/m)) {
                        return '<ol class="space-y-1">' + block.replace(/^\d+\.\s+(.+)$/gm, '<li class="my-1">$1</li>') + '</ol>';
                      } else if (block.match(/^<h[1-4]>/)) {
                        return block; // Already a header
                      } else {
                        return block ? '<p>' + block + '</p>' : '';
                      }
                    })
                    .join('')
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setSuggestions(null)}
                variant="outline"
                size="sm"
                className="border-emerald-300/50 hover:bg-emerald-300/20"
              >
                Generate New Suggestions
              </Button>
              <Button
                onClick={() => navigator.clipboard.writeText(suggestions)}
                variant="outline"
                size="sm"
                className="border-emerald-300/50 hover:bg-emerald-300/20"
              >
                Copy to Clipboard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
