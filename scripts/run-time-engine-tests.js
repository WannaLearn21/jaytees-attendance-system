const ts = require('typescript');
const fs = require('fs');

const engineSource = fs.readFileSync('src/lib/attendance/timeEngine.ts', 'utf8');
const testSource = fs.readFileSync('src/lib/attendance/timeEngine.test.ts', 'utf8');

// Combine, replacing the relative import so all functions live in same scope
const combined = engineSource + '\n' + testSource.replace(/import\s*\{[\s\S]*?\}\s*from\s*["'].\/timeEngine["'];?/g, '');

const js = ts.transpileModule(combined, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

const mod = {};
eval(js + '; mod.run = runTimeEngineTests;');
const res = mod.run();

console.log(`\n========================================`);
console.log(`PHASE 4: TIME ENGINE UNIT TEST RESULTS`);
console.log(`========================================`);
console.log(`Passed: ${res.passed} / ${res.total}`);
console.log(`Failures: ${res.failures.length}`);

if (res.failures.length > 0) {
  console.error('Failed Tests:', res.failures);
  process.exit(1);
} else {
  console.log(`\nAll 25 table-driven unit tests passed with 100% compliance!`);
}
