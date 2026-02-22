const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  // Em-dash mojibake
  [/â€"/g, '--'],
  [/â€"/g, '--'],
  // Check mark
  [/âœ"/g, 'OK'],
  // X mark
  [/âœ•/g, 'x'],
  // Check with box
  [/âœ…/g, 'OK '],
  // Warning sign
  [/âš ï¸/g, '! '],
  // Phone emoji
  [/ðŸ"ž /g, ''],
  [/ðŸ"ž/g, ''],
  // Chart emoji
  [/ðŸ"Š /g, ''],
  [/ðŸ"Š/g, ''],
  // Lock emoji  
  [/ðŸ"' /g, ''],
  [/ðŸ"'/g, ''],
  // Crown emoji
  [/ðŸ'' /g, ''],
  [/ðŸ''/g, ''],
  // Handshake emoji
  [/ðŸ¤ /g, ''],
  [/ðŸ¤/g, ''],
  // Teacher emoji
  [/ðŸ§'â€ðŸ« /g, ''],
  [/ðŸ§'â€ðŸ«/g, ''],
  // Business person emoji
  [/ðŸ'¨â€ðŸ'¼ /g, ''],
  [/ðŸ'¨â€ðŸ'¼/g, ''],
  // Shield emoji
  [/ðŸ›¡ï¸ /g, ''],
  [/ðŸ›¡ï¸/g, ''],
];

for (const [pattern, replacement] of replacements) {
  const before = content.length;
  content = content.replace(pattern, replacement);
  if (content.length !== before) {
    console.log(`Replaced: ${pattern.source} -> "${replacement}" (${before - content.length} chars removed)`);
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log('Done! File saved.');
