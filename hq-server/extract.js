const fs = require('fs');
const lines = fs.readFileSync('src/controllers/queueController.js', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('const cancelEntry ='));
for (let i = start; i < start + 30; i++) { if (lines[i]) console.log(lines[i]); }
