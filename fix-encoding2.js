const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// These are the actual byte sequences as they appear in the file
const replacements = [
  // â€" (em dash) -> --
  ['\u00e2\u0080\u0094', '--'],
  ['\u00e2\u0080\u0093', '--'],
  // Common pattern: â€"
  ['â\u0080\u0094', '--'],
  ['â\u0080\u0093', '--'],
  // Check mark âœ" 
  ['â\u009c\u0094', 'OK'],
  ['\u00e2\u009c\u0094', 'OK'],
  // X mark âœ•
  ['â\u009c\u0095', 'x'],
  ['\u00e2\u009c\u0095', 'x'],
  // Warning âš ï¸
  ['â\u009a\u00a0ï\u00b8', '! '],
  ['\u00e2\u009a\u00a0\u00ef\u00b8\u008f', '! '],
  // ðŸ"ž phone
  ['ð\u009f\u0093\u009e', ''],
  ['\u00f0\u009f\u0093\u009e', ''],
  // ðŸ"Š chart
  ['ð\u009f\u0093\u008a', ''],
  ['\u00f0\u009f\u0093\u008a', ''],
  // ðŸ"' lock
  ['ð\u009f\u0094\u0092', ''],
  ['\u00f0\u009f\u0094\u0092', ''],
  // ðŸ'' crown
  ['ð\u009f\u0091\u0091', ''],
  ['\u00f0\u009f\u0091\u0091', ''],
];

// Simple string replacements
const simpleReplacements = [
  ['â€"', '--'],
  ['âœ"', 'OK'],
  ['âœ•', 'x'],
  ['âœ…', 'OK '],
  ['âš ï¸', '! '],
  ['ðŸ"ž ', ''],
  ['ðŸ"ž', ''],
  ['ðŸ"Š ', ''],
  ['ðŸ"Š', ''],
  ['ðŸ"' ', ''],
  ['ðŸ"'', ''],
  ['ðŸ'' ', ''],
  ['ðŸ''', ''],
  ['ðŸ¤ ', ''],
  ['ðŸ¤', ''],
  ['ðŸ§'â€ðŸ« ', ''],
  ['ðŸ§'â€ðŸ«', ''],
  ['ðŸ'¨â€ðŸ'¼ ', ''],
  ['ðŸ'¨â€ðŸ'¼', ''],
  ['ðŸ›¡ï¸ ', ''],
  ['ðŸ›¡ï¸', ''],
];

let count = 0;
for (const [search, replacement] of simpleReplacements) {
  while (content.includes(search)) {
    content = content.replace(search, replacement);
    count++;
  }
}
console.log(`Simple replacements: ${count}`);

count = 0;
for (const [search, replacement] of replacements) {
  while (content.includes(search)) {
    content = content.replace(search, replacement);
    count++;
  }
}
console.log(`Unicode replacements: ${count}`);

// Final check: find remaining non-ASCII chars on suspicious lines
const lines = content.split('\n');
let issues = 0;
lines.forEach((line, i) => {
  if (/[^\x00-\x7F]/.test(line)) {
    // Only report if it's NOT inside a base64 data URL or a valid character
    if (!line.includes('data:image') && !line.includes('PHN2Z') && !/['']/.test(line)) {
      const nonAscii = line.match(/[^\x00-\x7F]+/g);
      if (nonAscii) {
        // Filter out common OK non-ASCII (smart quotes etc.)
        const problematic = nonAscii.filter(s => !/^[\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u00e9\u00f1]+$/.test(s));
        if (problematic.length > 0) {
          console.log(`Line ${i+1}: ${problematic.map(s => `"${s}" (${[...s].map(c => 'U+' + c.charCodeAt(0).toString(16).padStart(4,'0')).join(',')})`).join(', ')}`);
          issues++;
        }
      }
    }
  }
});
console.log(`Remaining issues: ${issues}`);

fs.writeFileSync(file, content, 'utf8');
console.log('File saved.');
