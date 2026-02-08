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
  Grid3X3,
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
const buildMountSinaiLayoutRooms = () => {
  const rows = 9;
  const cols = 5;
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => "Care"));

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const isPerimeter = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
      if (isPerimeter && !(r === 0 && c === 2)) {
        grid[r][c] = "Wall";
      }
    }
  }

  grid[0][0] = "Entrance";
  grid[0][1] = "Waiting";

  grid[3][1] = "High Severity";
  grid[7][3] = "High Severity";

  grid[5][3] = "Low Severity";
  grid[7][1] = "Low Severity";
  grid[1][3] = "Low Severity";

  return grid.flat();
};

const MOUNT_SINAI_LAYOUT_ROOMS = buildMountSinaiLayoutRooms();

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
    rooms: MOUNT_SINAI_LAYOUT_ROOMS,
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
 * next line: integer k = number of nurses
 * next k lines: two integers r, c (position)
 * next line: integer d = number of doctors
 * next d lines: two integers r, c (position)
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

    // Parse nurse positions (if present)
    let nursePositions: [number, number][] | undefined;
    if (lineIndex < lines.length) {
      const numNurses = parseInt(lines[lineIndex++], 10);
      if (!isNaN(numNurses) && numNurses > 0) {
        nursePositions = [];
        for (let i = 0; i < numNurses; i++) {
          if (lineIndex < lines.length) {
            const [r, c] = lines[lineIndex++].split(/\s+/).map(Number);
            nursePositions.push([r, c]);
          }
        }
      }
    }

    // Parse doctor positions (if present)
    let doctorPositions: [number, number][] | undefined;
    if (lineIndex < lines.length) {
      const numDoctors = parseInt(lines[lineIndex++], 10);
      if (!isNaN(numDoctors) && numDoctors > 0) {
        doctorPositions = [];
        for (let i = 0; i < numDoctors; i++) {
          if (lineIndex < lines.length) {
            const [r, c] = lines[lineIndex++].split(/\s+/).map(Number);
            doctorPositions.push([r, c]);
          }
        }
      }
    }

    return { hospital, lowSeverityRooms, highSeverityRooms, nursePositions, doctorPositions };
  } catch (error) {
    console.error("Failed to parse hospital config:", error);
    return null;
  }
}

// Helper function to create MCI config from standard config
// MCI mode keeps the same room layout but with increased capacity and faster arrivals
function getMCIConfig(standardConfig: SimulationConfig): SimulationConfig {
  // Return the same config - room types stay unchanged
  // The MCI mode behavior (2 patients per high-severity room, faster arrivals)
  // is handled in the HeatmapSimulation component
  return standardConfig;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState("");
  const [uploads, setUploads] = useState<HospitalUpload[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig | undefined>(undefined);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null);
  const [customConfigLoaded, setCustomConfigLoaded] = useState(false);

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
  const hasUploadsForOrg = organizationUploads.length > 0 || organizationKey === "mount-sinai";
  const showLayoutInsights = hasUploadsForOrg;

  // Stats data - show dashes until file is uploaded, with slight variations per hospital
  const getStatsForHospital = () => {
    if (!hasUploadsForOrg) {
      return [
        { label: "Acuity Clumps", value: "-", detail: "Active transfer bundles" },
        { label: "Corridor Saturation", value: "-", detail: "Peak hallway load" },
        { label: "Transfer Delay", value: "-", detail: "Median corridor delay" },
      ];
    }

    // Slight variations per hospital
    const hospitalStats: Record<string, { census: string; wait: string; throughput: string }> = {
      "northside": { census: "47", wait: "12m", throughput: "+18%" },
      "mount-sinai": { census: "52", wait: "14m", throughput: "+15%" },
      "johns-hopkins": { census: "44", wait: "10m", throughput: "+22%" },
      "cleveland-clinic": { census: "49", wait: "13m", throughput: "+16%" },
      "mass-general": { census: "51", wait: "11m", throughput: "+20%" },
    };

    const stats = hospitalStats[organizationKey] || hospitalStats["northside"];
    return [
      { label: "Acuity Clumps", value: stats.census, detail: "Active transfer bundles" },
      { label: "Corridor Saturation", value: stats.wait, detail: "Peak hallway load" },
      { label: "Transfer Delay", value: stats.throughput, detail: "Median corridor delay" },
    ];
  };

  const statsData = getStatsForHospital();

  useEffect(() => {
    const storedOrg = localStorage.getItem("atria:org") ?? "";
    setOrganization(storedOrg);
    const storedEmail = localStorage.getItem("atria:email") ?? "";
    const storedName = localStorage.getItem("atria:displayName") ?? "";
    const storedRole = localStorage.getItem("atria:role") ?? "";
    setDisplayName(storedName || storedEmail);
    setRole(storedRole || "ER Specialist");

    // Check for custom simulation config from layout builder
    const customConfigStr = localStorage.getItem("atria:customSimulationConfig");
    if (customConfigStr && !customConfigLoaded) {
      try {
        const customConfig = JSON.parse(customConfigStr);
        setSimulationConfig(customConfig);
        setCustomConfigLoaded(true);
        setUploadStatus({
          type: "success",
          message: "Custom hospital layout loaded successfully. Simulation ready to run!",
        });
        // Clear the stored config after loading
        localStorage.removeItem("atria:customSimulationConfig");
      } catch (err) {
        console.error("Failed to load custom config:", err);
      }
    }

    // Load uploads from Supabase
    const loadUploads = async () => {
      try {
        const { data, error } = await supabase
          .from("hospital_uploads")
          .select("*")
          .order("uploaded_at", { ascending: false });

        if (error) {
          console.error("Error loading uploads:", error);
          // Fallback to localStorage
          const storedUploads = localStorage.getItem("atria:hospitalUploads");
          if (storedUploads) {
            try {
              setUploads(JSON.parse(storedUploads));
            } catch {
              setUploads([]);
            }
          }
        } else if (data) {
          // Map Supabase data to HospitalUpload format
          const mappedUploads: HospitalUpload[] = data.map((item) => ({
            id: item.id,
            fileName: item.file_name,
            uploadedAt: item.uploaded_at,
            uploadedBy: item.uploaded_by,
            organization: item.organization,
          }));
          setUploads(mappedUploads);
        }
      } catch (err) {
        console.error("Failed to load uploads:", err);
        // Fallback to localStorage
        const storedUploads = localStorage.getItem("atria:hospitalUploads");
        if (storedUploads) {
          try {
            setUploads(JSON.parse(storedUploads));
          } catch {
            setUploads([]);
          }
        }
      }
    };

    loadUploads();

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
      setOrganization(profile.hospital ?? "");
      localStorage.setItem("atria:displayName", profile.display_name ?? "");
      localStorage.setItem("atria:org", profile.hospital ?? "");
    };

    void loadProfile();
  }, [customConfigLoaded]);

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
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const config = parseHospitalConfigFile(content);

      if (config) {
        setSimulationConfig(config);
        setUploadStatus({
          type: "success",
          message: `Loaded ${config.hospital.length}x${config.hospital[0].length} hospital layout with ${config.lowSeverityRooms.length} low-severity and ${config.highSeverityRooms.length} high-severity rooms`,
        });

        // Also record in upload history
        const uploadedByName = (localStorage.getItem("atria:displayName") || localStorage.getItem("atria:email")) ?? "unknown";
        const org = localStorage.getItem("atria:org") ?? "unknown";
        const entry: HospitalUpload = {
          id: `${Date.now()}-${file.name}`,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          uploadedBy: uploadedByName,
          organization: org,
        };

        // Save to Supabase
        try {
          const { error: insertError } = await supabase
            .from("hospital_uploads")
            .insert({
              id: entry.id,
              file_name: entry.fileName,
              uploaded_at: entry.uploadedAt,
              uploaded_by: entry.uploadedBy,
              organization: entry.organization,
            });

          if (insertError) {
            console.error("Error saving upload to Supabase:", insertError);
            // Fallback to localStorage
            const nextUploads = [entry, ...uploads];
            setUploads(nextUploads);
            localStorage.setItem("atria:hospitalUploads", JSON.stringify(nextUploads));
          } else {
            // Reload uploads from Supabase
            const { data } = await supabase
              .from("hospital_uploads")
              .select("*")
              .order("uploaded_at", { ascending: false });

            if (data) {
              const mappedUploads: HospitalUpload[] = data.map((item) => ({
                id: item.id,
                fileName: item.file_name,
                uploadedAt: item.uploaded_at,
                uploadedBy: item.uploaded_by,
                organization: item.organization,
              }));
              setUploads(mappedUploads);
            }
          }
        } catch (err) {
          console.error("Failed to save upload:", err);
          // Fallback to localStorage
          const nextUploads = [entry, ...uploads];
          setUploads(nextUploads);
          localStorage.setItem("atria:hospitalUploads", JSON.stringify(nextUploads));
        }
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

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Placeholder - just record the upload
    setUploadStatus({
      type: "success",
      message: `Video "${file.name}" uploaded. Video processing coming soon.`,
    });

    const uploadedByName = (localStorage.getItem("atria:displayName") || localStorage.getItem("atria:email")) ?? "unknown";
    const org = localStorage.getItem("atria:org") ?? "unknown";
    const entry: HospitalUpload = {
      id: `${Date.now()}-${file.name}`,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uploadedByName,
      organization: org,
    };

    // Save to Supabase
    try {
      const { error: insertError } = await supabase
        .from("hospital_uploads")
        .insert({
          id: entry.id,
          file_name: entry.fileName,
          uploaded_at: entry.uploadedAt,
          uploaded_by: entry.uploadedBy,
          organization: entry.organization,
        });

      if (insertError) {
        console.error("Error saving upload to Supabase:", insertError);
        // Fallback to localStorage
        const nextUploads = [entry, ...uploads];
        setUploads(nextUploads);
        localStorage.setItem("atria:hospitalUploads", JSON.stringify(nextUploads));
      } else {
        // Reload uploads from Supabase
        const { data } = await supabase
          .from("hospital_uploads")
          .select("*")
          .order("uploaded_at", { ascending: false });

        if (data) {
          const mappedUploads: HospitalUpload[] = data.map((item) => ({
            id: item.id,
            fileName: item.file_name,
            uploadedAt: item.uploaded_at,
            uploadedBy: item.uploaded_by,
            organization: item.organization,
          }));
          setUploads(mappedUploads);
        }
      }
    } catch (err) {
      console.error("Failed to save upload:", err);
      // Fallback to localStorage
      const nextUploads = [entry, ...uploads];
      setUploads(nextUploads);
      localStorage.setItem("atria:hospitalUploads", JSON.stringify(nextUploads));
    }
  };

  const handleClearUploads = async () => {
    if (window.confirm("Are you sure you want to clear all upload history for this organization? This cannot be undone.")) {
      try {
        // Delete from Supabase
        const { error: deleteError } = await supabase
          .from("hospital_uploads")
          .delete()
          .eq("organization", organization);

        if (deleteError) {
          console.error("Error deleting uploads from Supabase:", deleteError);
          // Fallback to localStorage
          const updatedUploads = uploads.filter((item) => item.organization !== organization);
          setUploads(updatedUploads);
          localStorage.setItem("atria:hospitalUploads", JSON.stringify(updatedUploads));
        } else {
          // Reload uploads from Supabase
          const { data } = await supabase
            .from("hospital_uploads")
            .select("*")
            .order("uploaded_at", { ascending: false });

          if (data) {
            const mappedUploads: HospitalUpload[] = data.map((item) => ({
              id: item.id,
              fileName: item.file_name,
              uploadedAt: item.uploaded_at,
              uploadedBy: item.uploaded_by,
              organization: item.organization,
            }));
            setUploads(mappedUploads);
          }
        }

        setUploadStatus({
          type: "success",
          message: "Upload history cleared for this organization.",
        });
      } catch (err) {
        console.error("Failed to clear uploads:", err);
        // Fallback to localStorage
        const updatedUploads = uploads.filter((item) => item.organization !== organization);
        setUploads(updatedUploads);
        localStorage.setItem("atria:hospitalUploads", JSON.stringify(updatedUploads));
        setUploadStatus({
          type: "success",
          message: "Upload history cleared for this organization.",
        });
      }
    }
  };

  const csvEscape = (value: string) => {
    const needsQuotes = /[",\n]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const handleExportCsv = () => {
    const rows: string[][] = [
      ["Section", "Label", "Value", "Detail"],
      ["Report", "Organization", organization || "Not set", ""],
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
    <main className="dark relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 hospital-landing" />
        <div className="absolute inset-0 bg-slate-950/70" />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full lg:w-64 lg:shrink-0">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-sm backdrop-blur"
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
                  Layout Configuration
                </p>

                {/* Build Your Own Layout Option */}
                <div className="mt-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-white/15 bg-slate-950/60 text-white hover:bg-slate-950/80 hover:text-emerald-300"
                    onClick={() => navigate("/build-layout")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                    Build Your Own Layout
                  </Button>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Design a custom hospital floor plan
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] text-white/40">or upload</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Hospital Config File Upload */}
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground" htmlFor="config-upload">
                    <FileText className="h-4 w-4" />
                    Floor Plan Graph (.txt)
                  </label>
                  <input
                    id="config-upload"
                    type="file"
                    accept=".txt"
                    onChange={handleConfigFileUpload}
                    className="mt-2 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-300 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-900 hover:file:bg-emerald-200"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Format: nodes, edges, treatment rooms
                  </p>
                </div>

                {/* Video Upload */}
                <div className="mt-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground" htmlFor="video-upload">
                    <Video className="h-4 w-4" />
                    Corridor Feed
                  </label>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="mt-2 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-300 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-900 hover:file:bg-emerald-200"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Corridor video processing coming soon
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
                  <div className="mt-3 rounded-lg border border-green-500/60 bg-green-500/20 p-3 text-xs">
                    <p className="font-medium text-green-200">Custom Layout Active</p>
                    <p className="text-green-300/80">
                      {simulationConfig.hospital.length}x{simulationConfig.hospital[0].length} grid with{" "}
                      {simulationConfig.lowSeverityRooms.length} low-severity and{" "}
                      {simulationConfig.highSeverityRooms.length} high-severity rooms
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSimulationConfig(undefined);
                        setCustomConfigLoaded(false);
                        setUploadStatus(null);
                      }}
                      className="mt-2 h-6 text-[10px] text-green-300 hover:bg-green-500/30 hover:text-green-100"
                    >
                      Clear Custom Layout
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6">
                <div className="border-t border-border/60 pt-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-left transition hover:bg-slate-950/90">
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
                  Operations Console
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-foreground">Surge Simulation Workspace</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="rounded-full bg-emerald-300 text-slate-900 shadow-sm hover:bg-emerald-200">
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

            <Card className="mb-10 w-full max-w-xl border-white/10 bg-gradient-to-br from-emerald-300/15 via-slate-900/70 to-transparent">
              <CardHeader>
                <CardTitle className="font-display text-3xl font-semibold text-foreground">
                  Welcome, {displayName || formattedName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Upload a graph-based floor plan, select a surge scenario, and study corridor friction before a single wall
                  is built.
                </p>
              </CardContent>
            </Card>

            <motion.section
              id="scenarios"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
              className="mb-10 grid gap-4 md:grid-cols-3"
            >
              {[
                {
                  title: "Mass-Casualty Incident",
                  detail: "ED, imaging, and OR corridors spike within minutes.",
                  tag: "MCI",
                },
                {
                  title: "Pandemic Surge",
                  detail: "Sustained throughput with isolation routing constraints.",
                  tag: "Pandemic",
                },
                {
                  title: "Extreme Transfers",
                  detail: "Multiple ICU-level moves with equipment-heavy clumps.",
                  tag: "Acuity+",
                },
              ].map((card) => (
                <Card
                  key={card.title}
                  className="border-white/10 bg-slate-900/70"
                >
                  <CardHeader>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/60">
                      {card.tag}
                    </span>
                    <p className="mt-3 text-sm text-muted-foreground">{card.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.section>

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
                  className="relative overflow-hidden border-white/10 bg-slate-900/70 shadow-sm"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 to-transparent" />
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
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Heatmap Output
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    Corridor friction under surge load
                  </h2>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/60">
                  Live
                </span>
              </div>

              {simulationConfig ? (
                <div className="space-y-8">
                  <HeatmapSimulation
                    config={simulationConfig}
                    mode="standard"
                    label="Standard Simulation"
                  />
                  <HeatmapSimulation
                    config={getMCIConfig(simulationConfig)}
                    mode="mci"
                    label="MCI / Pandemic Simulation"
                  />
                </div>
              ) : (
                <Card className="w-full">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-foreground mb-2">No Layout Loaded</h3>
                      <p className="text-muted-foreground mb-6">
                        Build a custom hospital layout to run simulations
                      </p>
                      <Button
                        onClick={() => navigate("/build-layout")}
                        className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
                      >
                        Build Layout
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
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
                  <CardTitle>Layout Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Facility
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
                          {layoutProfile.rooms.map((room, idx) => (
                            <div
                              key={`${room}-${idx}`}
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
                  {hasUploadsForOrg && (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 mb-4">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">
                        Active Contributors
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {organizationKey === "mount-sinai" ? (
                          <div
                            className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Dr. Ethan Zhang
                          </div>
                        ) : (
                          Array.from(new Set(organizationUploads.map(u => u.uploadedBy))).map((doctor) => (
                            <div
                              key={doctor}
                              className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Dr. {doctor}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                    {organizationUploads.length === 0 && organizationKey !== "mount-sinai" ? (
                      <p className="text-sm text-muted-foreground">
                        No uploads yet for this organization. Upload a file to see live metrics and layout insights.
                      </p>
                    ) : (
                      <>
                        <div className="space-y-3 text-sm">
                          {organizationKey === "mount-sinai" && organizationUploads.length === 0 ? (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-foreground">
                                  mount_sinai_config.txt
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded by Dr. Ethan Zhang
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Updated by Ethan Zhang
                              </p>
                            </div>
                          ) : (
                            organizationUploads.map((item) => (
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
                            ))
                          )}
                        </div>
                        {organizationUploads.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-border/40">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearUploads}
                              className="w-full text-xs text-muted-foreground hover:text-destructive hover:border-destructive/50"
                            >
                              Clear Upload History
                            </Button>
                          </div>
                        )}
                      </>
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
