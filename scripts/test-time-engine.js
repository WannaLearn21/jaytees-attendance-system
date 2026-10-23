const { register } = require('ts-node');

// Compile TypeScript in-memory using ts-node or run plain JS
const path = require('path');

// Simple native test runner for timeEngine
const { runTimeEngineTests } = require('../src/lib/attendance/timeEngine.test.ts');
