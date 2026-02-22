const fs = require('fs');
const path = require('path');

const dashFile = path.join(__dirname, 'frontend', 'src', 'pages', 'Dashboard.tsx');
const newPartner = fs.readFileSync(path.join(__dirname, 'temp-partner-dashboard.tsx'), 'utf8');

const content = fs.readFileSync(dashFile, 'utf8');
const lines = content.split('\n');

// Find the start: "// ========================================\n//  PARTNER DASHBOARD COMPONENT"
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('PARTNER DASHBOARD COMPONENT')) {
    // Start from the comment block above (line before)
    startLine = i - 1; // The "// =======" line
    break;
  }
}

// Find the end: the next "// ========================================\n//  TEACHER DASHBOARD COMPONENT"
for (let i = startLine + 3; i < lines.length; i++) {
  if (lines[i].includes('TEACHER DASHBOARD COMPONENT')) {
    endLine = i - 1; // The "// =======" line before it
    break;
  }
}

if (startLine === -1 || endLine === -1) {
  console.error('Could not find markers! startLine:', startLine, 'endLine:', endLine);
  process.exit(1);
}

console.log(`Replacing lines ${startLine + 1} to ${endLine + 1} (${endLine - startLine + 1} lines)`);

// Splice: keep lines before startLine, insert new content, keep lines from endLine onwards
const before = lines.slice(0, startLine);
const after = lines.slice(endLine);

const newContent = [...before, '', newPartner, '', ...after].join('\n');

fs.writeFileSync(dashFile, newContent, 'utf8');
console.log('Dashboard.tsx updated successfully!');
console.log(`Old size: ${lines.length} lines, New size: ${newContent.split('\n').length} lines`);
