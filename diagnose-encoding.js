const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');
const origLen = content.length;

// Find all non-ASCII sequences and their line numbers
const lines = content.split('\n');
const issues = [];
lines.forEach((line, i) => {
  if (/[^\x00-\x7F]/.test(line) && !line.includes('data:image') && !line.includes('PHN2Z')) {
    const matches = [...line.matchAll(/[^\x00-\x7F]+/g)];
    matches.forEach(m => {
      const hex = [...m[0]].map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join(' ');
      issues.push({ line: i+1, col: m.index, text: m[0], hex, context: line.substring(Math.max(0, m.index-20), m.index + m[0].length + 20).trim() });
    });
  }
});

console.log(`Found ${issues.length} non-ASCII sequences:`);
issues.forEach(i => console.log(`  L${i.line}: [${i.hex}] "${i.text}" => ...${i.context}...`));

fs.writeFileSync(file + '.encoding-report.txt', JSON.stringify(issues, null, 2), 'utf8');
console.log('Report saved to Dashboard.tsx.encoding-report.txt');
