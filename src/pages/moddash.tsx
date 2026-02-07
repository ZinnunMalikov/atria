import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Building2,
  Flame,
  FileText,
  Video,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeatmapSimulation, type SimulationConfig } from "@/components/HeatmapSimulation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";

type HospitalUpload = {
  id: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  organization: string;
};

type UploadStatus = {
  type: "success" | "error";
  message: string;
} | null;

type HospitalLayoutProfile = {
  label: string;
  layoutName: string;
  occupancy: string;
  rooms: string[];
  insights: { label: string; value: string }[];
};

const buildStandardLayoutRooms = () => {
  const rows = 4;
  const cols = 5;
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => "Care"));

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const isPerimeter = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
      if (isPerimeter) {
        grid[r][c] = "Wall";
      }
    }
  }

  grid[0][0] = "Entrance";
  grid[0][1] = "Waiting";
  grid[1][0] = "Low Severity";
  grid[rows - 1][cols - 1] = "High Severity";
  grid[rows - 1][1] = "Care";
  grid[rows - 1][2] = "Care";
  grid[rows - 1][3] = "Care";

  return grid.flat();
};

const STANDARD_LAYOUT_ROOMS = buildStandardLayoutRooms();

const HOSPITAL_PROFILES: Record<string, HospitalLayoutProfile> = {
  northside: {
    label: "Northside Hospital",
    layoutName: "Northside ER Layout",
    occupancy: "78%",
    rooms: STANDARD_LAYOUT_ROOMS,
    insights: [
      { label: "Peak congestion", value: "Triage + Waiting (32 visits/hr)" },
      { label: "Fast track load", value: "18 low-acuity cases queued" },
      { label: "Hallway throughput", value: "6 min avg transfer" },
    ],
  },
  "mount-sinai": {
    label: "Mount Sinai",
    layoutName: "Mount Sinai ER Layout",
    occupancy: "71%",
    rooms: STANDARD_LAYOUT_ROOMS,
    insights: [
      { label: "Peak congestion", value: "Imaging + Lab (24 visits/hr)" },
      { label: "Fast track load", value: "12 low-acuity cases queued" },
      { label: "Hallway throughput", value: "7 min avg transfer" },
    ],
  },
  "johns-hopkins": {
    label: "Johns Hopkins",
    layoutName: "Johns Hopkins ER Layout",
    occupancy: "69%",
    rooms: STANDARD_LAYOUT_ROOMS,
    insights: [
      { label: "Peak congestion", value: "Resus + Trauma (19 visits/hr)" },
      { label: "Fast track load", value: "9 low-acuity cases queued" },
      { label: "Hallway throughput", value: "5 min avg transfer" },
    ],
  },
  "cleveland-clinic": {
    label: "Cleveland Clinic",
    layoutName: "Cleveland Clinic ER Layout",
    occupancy: "74%",
    rooms: STANDARD_LAYOUT_ROOMS,
    insights: [
      { label: "Peak congestion", value: "Ambulance + Resus (21 visits/hr)" },
      { label: "Fast track load", value: "14 low-acuity cases queued" },
      { label: "Hallway throughput", value: "6 min avg transfer" },
    ],
  },
  "mass-general": {
    label: "Mass General",
    layoutName: "Mass General ER Layout",
    occupancy: "76%",
    rooms: STANDARD_LAYOUT_ROOMS,
    insights: [
      { label: "Peak congestion", value: "Triage + Lab (27 visits/hr)" },
      { label: "Fast track load", value: "16 low-acuity cases queued" },
      { label: "Hallway throughput", value: "6 min avg transfer" },
    ],
  },
};

/**
 * Parse hospital config text file format:
 * 1st row: two integers m and n (rows and cols)
 * next m lines: n integers separated by space (room types: -2=wall, -1=spawn, 0=free, 1=waiting)
 * next line: integer x = number of low-severity treatment rooms
 * next x lines: two integers r, c (position)
 * next line: integer y = number of high-severity treatment rooms
 * next y lines: two integers r, c (position)
 */
function parseHospitalConfigFile(content: string): SimulationConfig | null {
  try {
    const lines = content.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    let lineIndex = 0;

    // Parse dimensions
    const [m, n] = lines[lineIndex++].split(/\s+/).map(Number);
    if (isNaN(m) || isNaN(n) || m <= 0 || n <= 0) {
      throw new Error("Invalid dimensions");
    }

    // Parse hospital grid
    const hospital: number[][] = [];
    for (let i = 0; i < m; i++) {
      const row = lines[lineIndex++].split(/\s+/).map(Number);
      if (row.length !== n) {
        throw new Error(`Row ${i} has ${row.length} columns, expected ${n}`);
      }
      hospital.push(row);
    }

    // Parse low-severity treatment rooms
    const numLowSeverity = parseInt(lines[lineIndex++], 10);
    const lowSeverityRooms: [number, number][] = [];
    for (let i = 0; i < numLowSeverity; i++) {
      const [r, c] = lines[lineIndex++].split(/\s+/).map(Number);
      lowSeverityRooms.push([r, c]);
    }

    // Parse high-severity treatment rooms
    const numHighSeverity = parseInt(lines[lineIndex++], 10);
    const highSeverityRooms: [number, number][] = [];
    for (let i = 0; i < numHighSeverity; i++) {
      const [r, c] = lines[lineIndex++].split(/\s+/).map(Number);
      highSeverityRooms.push([r, c]);
    }

    return { hospital, lowSeverityRooms, highSeverityRooms };
  } catch (error) {
    console.error("Failed to parse hospital config:", error);
    return null;
  }
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState("");
  const [uploads, setUploads] = useState<HospitalUpload[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig | undefined>(undefined);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null);
  const statsData = [
    { label: "Live Census", value: "47", detail: "Patients in ED" },
    { label: "Average Wait", value: "12m", detail: "Door to provider" },
    { label: "Throughput", value: "+18%", detail: "Week over week" },
  ];
  const normalizedOrganization = organization.trim().toLowerCase();
  const organizationKey = useMemo(() => {
    if (!normalizedOrganization) return "";
    const directKey = normalizedOrganization.replace(/\s+/g, "-");
    if (HOSPITAL_PROFILES[directKey]) return directKey;
    const matchedEntry = Object.entries(HOSPITAL_PROFILES).find(
      ([key, profile]) =>
        normalizedOrganization === profile.label.toLowerCase() ||
        normalizedOrganization.includes(profile.label.toLowerCase()) ||
        normalizedOrganization.includes(key.replace(/-/g, " ")),
    );
    return matchedEntry?.[0] ?? directKey;
  }, [normalizedOrganization]);
  const organizationLabel =
    HOSPITAL_PROFILES[organizationKey]?.label ||
    (organization
      ? organization
          .replace(/-/g, " ")
          .replace(/\b\w/g, (match) => match.toUpperCase())
      : "");
  const layoutProfile = HOSPITAL_PROFILES[organizationKey] || null;
  const isNorthside = organizationKey === "northside";
  const organizationUploads = uploads.filter((item) => item.organization === organization);
  const hasUploadsForOrg = organizationUploads.length > 0;
  const showLayoutInsights = isNorthside || hasUploadsForOrg;

  useEffect(() => {
    const storedOrg = localStorage.getItem("atria:org") ?? "";
    setOrganization(storedOrg);
    const storedEmail = localStorage.getItem("atria:email") ?? "";
    const storedName = localStorage.getItem("atria:displayName") ?? "";
    const storedRole = localStorage.getItem("atria:role") ?? "";
    setDisplayName(storedName || storedEmail);
    setRole(storedRole || "ER Specialist");
    const storedUploads = localStorage.getItem("atria:hospitalUploads");
    if (storedUploads) {
      try {
        setUploads(JSON.parse(storedUploads));
      } catch {
        setUploads([]);
      }
    }

    const loadProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, hospital")
        .eq("id", user.id)
        .single();

      if (error || !profile) return;
      setDisplayName(profile.display_name ?? "");
      localStorage.setItem("atria:displayName", profile.display_name ?? "");
      const storedOrg = localStorage.getItem("atria:org") ?? "";
      if (!storedOrg && profile.hospital) {
        setOrganization(profile.hospital);
        localStorage.setItem("atria:org", profile.hospital);
      }
    };

    void loadProfile();
  }, []);

  const formattedName = useMemo(() => {
    if (!displayName) return "Dr. Clinician";
    if (displayName.startsWith("Dr. ")) return displayName;
    const source = displayName.includes("@") ? displayName.split("@")[0] : displayName;
    const tokens = source
      .split(/[._-\s]+/g)
      .filter(Boolean)
      .map((segment) => segment[0]?.toUpperCase() + segment.slice(1));
    if (tokens.length >= 2) {
      return `Dr. ${tokens[0]} ${tokens[1][0]}`;
    }
    if (tokens.length === 1) {
      const token = tokens[0];
      if (token.length > 8) {
        const firstName = token.slice(0, 6);
        const lastInitial = token.slice(6).trim()[0]?.toUpperCase();
        return `Dr. ${firstName}${lastInitial ? ` ${lastInitial}` : ""}`;
      }
      return `Dr. ${token}`;
    }
    return "Dr. Clinician";
  }, [displayName]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleConfigFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const config = parseHospitalConfigFile(content);

      if (config) {
        setSimulationConfig(config);
        setUploadStatus({
          type: "success",
          message: `Loaded ${config.hospital.length}x${config.hospital[0].length} hospital layout with ${config.lowSeverityRooms.length} low-severity and ${config.highSeverityRooms.length} high-severity rooms`,
        });

        // Also record in upload history
        const uploadedBy = localStorage.getItem("atria:email") ?? "unknown";
        const org = localStorage.getItem("atria:org") ?? "unknown";
        const entry: HospitalUpload = {
          id: `${Date.now()}-${file.name}`,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          uploadedBy,
          organization: org,
        };
        const nextUploads = [entry, ...uploads];
        setUploads(nextUploads);
        localStorage.setItem("atria:hospitalUploads", JSON.stringify(nextUploads));
      } else {
        setUploadStatus({
          type: "error",
          message: "Failed to parse config file. Please check the format.",
        });
      }
    };
    reader.onerror = () => {
      setUploadStatus({
        type: "error",
        message: "Failed to read file.",
      });
    };
    reader.readAsText(file);
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Placeholder - just record the upload
    setUploadStatus({
      type: "success",
      message: `Video "${file.name}" uploaded. Video processing coming soon.`,
    });

    const uploadedBy = localStorage.getItem("atria:email") ?? "unknown";
    const org = localStorage.getItem("atria:org") ?? "unknown";
    const entry: HospitalUpload = {
      id: `${Date.now()}-${file.name}`,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      organization: org,
    };
    const nextUploads = [entry, ...uploads];
    setUploads(nextUploads);
    localStorage.setItem("atria:hospitalUploads", JSON.stringify(nextUploads));
  };

  const csvEscape = (value: string) => {
    const needsQuotes = /[",\n]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const handleExportCsv = () => {
    const rows: string[][] = [
      ["Section", "Label", "Value", "Detail"],
      ["Report", "Organization", organizationLabel || organization || "Not set", ""],
      ["Report", "Prepared for", displayName || formattedName, ""],
    ];
    statsData.forEach((stat) => {
      rows.push(["Stats", stat.label, stat.value, stat.detail]);
    });
    if (uploads.length) {
      uploads.forEach((upload) => {
        rows.push([
          "Uploads",
          upload.fileName,
          upload.uploadedAt,
          `${upload.uploadedBy} (${upload.organization})`,
        ]);
      });
    } else {
      rows.push(["Uploads", "No uploads", "", ""]);
    }
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "atria-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const reportWindow = window.open("", "_blank", "width=900,height=700");
    if (!reportWindow) return;
    const uploadsMarkup = uploads.length
      ? uploads
          .map(
            (upload) =>
              `<tr><td>${upload.fileName}</td><td>${upload.uploadedAt}</td><td>${upload.uploadedBy}</td><td>${upload.organization}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="4">No uploads yet.</td></tr>`;
    const statsMarkup = statsData
      .map(
        (stat) =>
          `<tr><td>${stat.label}</td><td>${stat.value}</td><td>${stat.detail}</td></tr>`,
      )
      .join("");
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Atria Report</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; padding: 32px; }
            h1 { font-size: 24px; margin: 0 0 8px; }
            h2 { font-size: 16px; margin: 24px 0 8px; }
            p { margin: 0 0 12px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>Atria Operations Report</h1>
          <p>Organization: ${organization || "Not set"}</p>
          <p>Prepared for: ${displayName || formattedName}</p>
          <h2>Key Metrics</h2>
          <table>
            <thead>
              <tr><th>Metric</th><th>Value</th><th>Detail</th></tr>
            </thead>
            <tbody>
              ${statsMarkup}
            </tbody>
          </table>
          <h2>Recent Uploads</h2>
          <table>
            <thead>
              <tr><th>File</th><th>Uploaded At</th><th>Uploaded By</th><th>Organization</th></tr>
            </thead>
            <tbody>
              ${uploadsMarkup}
            </tbody>
          </table>
        </body>
      </html>`;
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 turing-grid opacity-30" />
        <div className="absolute inset-0 turing-lines turing-fade opacity-30" />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full lg:w-64 lg:shrink-0">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex h-full flex-col rounded-2xl border border-border/60 bg-gradient-to-b from-background/90 via-background/70 to-muted/30 p-5 shadow-sm backdrop-blur"
            >
              <div className="mb-4 flex items-center gap-3">
                <img src="/atria-logo.png" alt="Atria logo" className="h-10 w-10" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Operations
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">Atria</p>
                </div>
              </div>
              <nav className="space-y-1 text-sm">
                <a
                  href="#stats"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <Activity className="h-4 w-4" />
                  Live Statistics
                </a>
                <a
                  href="#heatmap"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <Flame className="h-4 w-4" />
                  Heatmap Simulation
                </a>
                <a
                  href="#hospital"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <Building2 className="h-4 w-4" />
                  {organizationLabel ? `Hospital: ${organizationLabel}` : "Hospital"}
                </a>
              </nav>

              <div className="mt-6 border-t border-border/60 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Upload
                </p>

                {/* Hospital Config File Upload */}
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground" htmlFor="config-upload">
                    <FileText className="h-4 w-4" />
                    Hospital Config (.txt)
                  </label>
                  <input
                    id="config-upload"
                    type="file"
                    accept=".txt"
                    onChange={handleConfigFileUpload}
                    className="mt-2 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-xs file:font-semibold file:text-background hover:file:bg-foreground/90"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Format: dimensions, grid, treatment rooms
                  </p>
                </div>

                {/* Video Upload */}
                <div className="mt-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground" htmlFor="video-upload">
                    <Video className="h-4 w-4" />
                    Video Feed
                  </label>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="mt-2 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-xs file:font-semibold file:text-background hover:file:bg-foreground/90"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Video processing coming soon
                  </p>
                </div>

                {/* Upload Status */}
                {uploadStatus && (
                  <div
                    className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-xs ${
                      uploadStatus.type === "success"
                        ? "bg-green-500/10 text-green-600"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {uploadStatus.type === "success" ? (
                      <CheckCircle className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{uploadStatus.message}</span>
                  </div>
                )}

                {/* Current config indicator */}
                {simulationConfig && (
                  <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
                    <p className="font-medium text-foreground">Custom Config Active</p>
                    <p className="text-muted-foreground">
                      {simulationConfig.hospital.length}x{simulationConfig.hospital[0].length} grid
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6">
                <div className="border-t border-border/60 pt-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-left transition hover:bg-background">
                        <p className="text-sm font-semibold text-foreground">{formattedName}</p>
                        <p className="text-xs text-muted-foreground">{role}</p>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top">
                      <DropdownMenuItem onSelect={() => navigate("/settings/profile")}>
                        Edit profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => navigate("/settings/2fa")}>
                        Enable 2FA
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={handleLogout}>Log out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          </aside>

          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="mb-10 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Client Console
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-foreground">Dashboard</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="rounded-full bg-gradient-to-r from-foreground to-foreground/90 text-background shadow-sm">
                      Export report
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        handleExportPdf();
                      }}
                    >
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        handleExportCsv();
                      }}
                    >
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>

            <Card className="mb-10 w-full max-w-xl border-border/60 bg-gradient-to-br from-[hsl(0_78%_55%_/_0.12)] via-background to-muted/20">
              <CardHeader>
                <CardTitle className="font-display text-3xl font-semibold text-foreground">
                  Welcome, {displayName || formattedName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get familiar with your dashboard and follow the steps below to get started.
                </p>
              </CardContent>
            </Card>

            <motion.section
              id="stats"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              className="grid gap-6 lg:grid-cols-3"
            >
              {statsData.map((stat) => (
                <Card
                  key={stat.label}
                  className="relative overflow-hidden border-border/60 bg-card/80 shadow-sm"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(0_78%_55%)] to-transparent" />
                  <CardHeader>
                    <CardTitle>{stat.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-semibold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.section>

            <motion.section
              id="heatmap"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
              className="mt-10"
            >
              <HeatmapSimulation config={simulationConfig} />
            </motion.section>

            <motion.section
              id="hospital"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
              className="mt-10"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Hospital Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Organization
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {organizationLabel || organization || "Not set"}
                    </p>
                  </div>
                  {layoutProfile && (
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {layoutProfile.layoutName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Modeled occupancy: {layoutProfile.occupancy}
                        </p>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                        <div className="grid grid-cols-5 gap-2 text-[11px] font-medium text-foreground/80">
                          {layoutProfile.rooms.map((room) => (
                            <div
                              key={room}
                              className="rounded-lg border border-border/60 bg-background/80 p-2 text-center"
                            >
                              {room}
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3 text-sm">
                          {showLayoutInsights
                            ? layoutProfile.insights.map((insight) => (
                                <div
                                  key={insight.label}
                                  className="rounded-xl border border-border/60 bg-background/80 p-3"
                                >
                                  <p className="text-xs text-muted-foreground">{insight.label}</p>
                                  <p className="mt-1 text-sm font-semibold text-foreground">
                                    {insight.value}
                                  </p>
                                </div>
                              ))
                            : ["Peak congestion", "Fast track load", "Hallway throughput"].map(
                                (label) => (
                                  <div
                                    key={label}
                                    className="rounded-xl border border-border/60 bg-background/80 p-3"
                                  >
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">-</p>
                                  </div>
                                ),
                              )}
                        </div>
                      </div>
                      <p className="mt-4 text-xs text-muted-foreground">
                        Each grid cell is categorized using the labels above to better characterize heatmaps.
                        More specific areas like triage and exam rooms are included within these categories.
                      </p>
                    </div>
                  )}
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                    {organizationUploads.length === 0 ? (
                      isNorthside ? (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                          <p>
                            Dr. Ethan Z uploaded data on 1/17/2026 at 3:42 PM. The layout insights
                            reflect this update.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No uploads yet for this organization. Add a CSV to see update history.
                        </p>
                      )
                    ) : (
                      <div className="space-y-3 text-sm">
                        {organizationUploads.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-2"
                          >
                            <div>
                              <p className="font-medium text-foreground">
                                {item.fileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded {new Date(item.uploadedAt).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Updated by {item.uploadedBy}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;