const { spawn } = require("child_process");
const path = require("path");

// Fix Windows lowercase drive letter bug (c:\ -> C:\) in Next.js 14 App Router
const cwd = process.cwd();
const fixedCwd = cwd.replace(/^[a-z]:/, (match) => match.toUpperCase());
try {
  process.chdir(fixedCwd);
} catch (err) {
  // ignore
}

const nextBin = path.join(fixedCwd, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "dev"], {
  cwd: fixedCwd,
  stdio: "inherit",
  env: { ...process.env },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
