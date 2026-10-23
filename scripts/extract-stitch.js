const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "stitch-ui");
const publicStitchDir = path.join(rootDir, "public", "stitch-ui");

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(publicStitchDir, { recursive: true });

const stepsDir =
  "C:/Users/asus/.gemini/antigravity/brain/d1c92478-ff12-4ed5-9b8f-8ba2b51b3eb6/.system_generated/steps";

const mapping = [
  { step: "158", file: "01-live-operations-selfie-feed.html", title: "JATS Live Operations & Selfie Feed" },
  { step: "159", file: "02-mobile-punch-station-senior-friendly.html", title: "JATS Mobile Punch Station (Senior-Friendly)" },
  { step: "160", file: "03-branch-geofences-mode-c-controls.html", title: "Branch Geofences & Mode C Controls" },
  { step: "161", file: "04-payroll-export-storage-center.html", title: "Payroll Export & Free-Tier Storage Center" },
  { step: "162", file: "05-shift-scheduling-grace-periods.html", title: "Shift Scheduling & Grace Periods" },
];

for (const m of mapping) {
  const raw = fs.readFileSync(path.join(stepsDir, m.step, "output.txt"), "utf8");
  const parsed = JSON.parse(raw);
  const html = parsed.html || (parsed.result && parsed.result.html) || raw;
  fs.writeFileSync(path.join(outDir, m.file), html, "utf8");
  fs.writeFileSync(path.join(publicStitchDir, m.file), html, "utf8");
  console.log("Saved", m.file, "bytes:", html.length);
}

// Extract Design System Markdown from step 150
const rawProj = fs.readFileSync(path.join(stepsDir, "150", "output.txt"), "utf8");
const parsedProj = JSON.parse(rawProj);
const jatsProj = parsedProj.projects.find((p) => p.title === "Jaytees Attendance System");
if (jatsProj && jatsProj.designTheme && jatsProj.designTheme.designMd) {
  fs.writeFileSync(path.join(outDir, "DESIGN_SYSTEM.md"), jatsProj.designTheme.designMd, "utf8");
  console.log("Saved DESIGN_SYSTEM.md");
}
