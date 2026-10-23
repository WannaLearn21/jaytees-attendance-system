const fs = require("fs");
const path = require("path");

const dirs = [
  path.resolve(__dirname, "..", "stitch-ui"),
  path.resolve(__dirname, "..", "public", "stitch-ui"),
];

const routeMap = {
  "dashboard": "01-live-operations-selfie-feed.html",
  "senior-punch-station-simulator": "02-mobile-punch-station-senior-friendly.html",
  "branch-geofences-and-mode-c-controls": "03-branch-geofences-mode-c-controls.html",
  "payroll-csv-and-export-center": "04-payroll-export-storage-center.html",
  "shift-scheduling": "05-shift-scheduling-grace-periods.html",
};

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
  for (const file of files) {
    const fullPath = path.join(dir, file);
    let html = fs.readFileSync(fullPath, "utf8");

    // Replace data-path="..." href="#" with the actual screen file href
    for (const [dataPath, targetFile] of Object.entries(routeMap)) {
      const regex1 = new RegExp(`data-path="${dataPath}"\\s+href="#"`, "g");
      html = html.replace(regex1, `data-path="${dataPath}" href="${targetFile}"`);

      const regex2 = new RegExp(`href="#"([^>]*data-path="${dataPath}")`, "g");
      html = html.replace(regex2, `href="${targetFile}"$1`);
    }

    fs.writeFileSync(fullPath, html, "utf8");
  }
}
console.log("Linked all 5 Stitch HTML screens across stitch-ui/ and public/stitch-ui/");
