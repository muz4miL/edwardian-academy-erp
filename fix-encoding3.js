const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// Map of hex sequences to replacements
const fixes = [
  // em dash: 00e2 20ac 201d => --
  { find: '\u00e2\u20ac\u201d', replace: ' -- ' },
  // em dash variant: 2014 => --
  { find: '\u2014', replace: ' -- ' },
  // check mark: 00e2 0153 201c => OK checkmark 
  { find: '\u00e2\u0153\u201c', replace: '' },
  // warning: 00e2 0161 00a0 00ef 00b8 008f
  { find: '\u00e2\u0161\u00a0\u00ef\u00b8\u008f', replace: '' },
  // phone: 00f0 0178 201c 017e
  { find: '\u00f0\u0178\u201c\u017e', replace: '' },
  // chart: 00f0 0178 201c 0160
  { find: '\u00f0\u0178\u201c\u0160', replace: '' },
  // lock: 00f0 0178 201d 2019
  { find: '\u00f0\u0178\u201d\u2019', replace: '' },
  // crown: 00f0 0178 2018 2018
  { find: '\u00f0\u0178\u2018\u2018', replace: '' },
  // teacher emoji: 00f0 0178 00a7 2018 00e2 20ac 008d 00f0 0178 008f 00ab
  { find: '\u00f0\u0178\u00a7\u2018\u00e2\u20ac\u008d\u00f0\u0178\u008f\u00ab', replace: '' },
  // business person: 00f0 0178 2018 00a8 00e2 20ac 008d 00f0 0178 2019 00bc
  { find: '\u00f0\u0178\u2018\u00a8\u00e2\u20ac\u008d\u00f0\u0178\u2019\u00bc', replace: '' },
  // bullet: 00e2 2014 008f => (bullet point)
  { find: '\u00e2\u2014\u008f', replace: '' },
  // stray control chars
  { find: '\u009d', replace: '' },
  { find: '\u008f', replace: '' },
];

let totalReplaced = 0;
for (const { find, replace } of fixes) {
  let count = 0;
  while (content.includes(find)) {
    content = content.replace(find, replace);
    count++;
  }
  if (count > 0) {
    const hex = [...find].map(c => c.charCodeAt(0).toString(16).padStart(4,'0')).join(' ');
    console.log(`Replaced [${hex}] x${count} -> "${replace}"`);
    totalReplaced += count;
  }
}

console.log(`\nTotal replacements: ${totalReplaced}`);

// Verify: check remaining non-ASCII
const lines = content.split('\n');
let remaining = 0;
lines.forEach((line, i) => {
  if (/[^\x00-\x7F]/.test(line) && !line.includes('data:image') && !line.includes('PHN2Z')) {
    const matches = [...line.matchAll(/[^\x00-\x7F]+/g)];
    matches.forEach(m => {
      const hex = [...m[0]].map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join(' ');
      console.log(`  REMAINING L${i+1}: [${hex}] "${m[0]}"`);
      remaining++;
    });
  }
});
console.log(`Remaining non-ASCII: ${remaining}`);

fs.writeFileSync(file, content, 'utf8');
console.log('File saved.');
