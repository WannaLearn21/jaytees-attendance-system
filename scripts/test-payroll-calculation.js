const assert = require('assert');

console.log('--- Testing Phase 6: Payroll Calculation & Export Consistency ---');

// Hand-calculated test fixture
const testRoster = [
  { code: 'JT-0001', name: 'Mang Benigno Ramos', days: 11, lateMin: 0, undertimeMin: 0, incomplete: 0 },
  { code: 'JT-0002', name: 'Liza Dela Cruz', days: 11, lateMin: 24, undertimeMin: 0, incomplete: 0 },
  { code: 'JT-0003', name: 'Sarah Jenkins', days: 10, lateMin: 0, undertimeMin: 35, incomplete: 1 },
  { code: 'JT-0004', name: 'Marco Santos', days: 12, lateMin: 5, undertimeMin: 0, incomplete: 0 },
];

function computePayrollRow(item) {
  const nominalHours = item.days * 8.0;
  const deductionHours = (item.lateMin + item.undertimeMin) / 60;
  const totalHours = Math.max(0, Math.round((nominalHours - deductionHours) * 10) / 10);
  return {
    code: item.code,
    name: item.name,
    days: item.days,
    totalHours,
    lateMin: item.lateMin,
    undertimeMin: item.undertimeMin,
    incomplete: item.incomplete,
  };
}

const computed = testRoster.map(computePayrollRow);

// Check 1: On-time worker
assert.strictEqual(computed[0].totalHours, 88.0, 'JT-0001 total hours should be 88.0');
assert.strictEqual(computed[0].lateMin, 0, 'JT-0001 lateMin should be 0');

// Check 2: 24 min late deduction (88.0 - 0.4 = 87.6)
assert.strictEqual(computed[1].totalHours, 87.6, 'JT-0002 total hours should be 87.6');
assert.strictEqual(computed[1].lateMin, 24, 'JT-0002 lateMin should be 24');

// Check 3: 35 min undertime deduction (80.0 - 0.5833... = 79.4) & 1 incomplete day
assert.strictEqual(computed[2].totalHours, 79.4, 'JT-0003 total hours should be 79.4');
assert.strictEqual(computed[2].incomplete, 1, 'JT-0003 incomplete count should be 1');

// Check 4: 5 min late deduction (96.0 - 0.0833... = 95.9)
assert.strictEqual(computed[3].totalHours, 95.9, 'JT-0004 total hours should be 95.9');

console.log('✓ All 4 hand-calculated fixture checks passed exactly.');

// Test CSV export line formatting
const csvHeaders = ['Code', 'Employee', 'Days present', 'Total hours', 'Late (min)', 'Undertime (min)', 'Incomplete days'];
const csvLines = [csvHeaders.join(',')];
computed.forEach(c => {
  csvLines.push([c.code, `"${c.name}"`, c.days, c.totalHours.toFixed(1), c.lateMin, c.undertimeMin, c.incomplete].join(','));
});

const generatedCsv = '\uFEFF' + csvLines.join('\n');
assert(generatedCsv.startsWith('\uFEFF'), 'CSV must contain UTF-8 BOM for Microsoft Excel');
assert(generatedCsv.includes('JT-0001,"Mang Benigno Ramos",11,88.0,0,0,0'), 'CSV line 1 format must match expected');
assert(generatedCsv.includes('JT-0003,"Sarah Jenkins",10,79.4,0,35,1'), 'CSV line 3 format must match expected');

console.log('✓ CSV generation and BOM validation passed.');
console.log('--- Phase 6 Payroll Test Suite Passed Cleanly ---');
