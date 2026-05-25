const fs = require('fs');
const path = 'C:\\dev\\DigiReps Tracker\\apps\\admin-portal\\src\\pages\\Landing.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the mangled string with proper trademark symbol
content = content.replace(/TrackOwlâ„¢/g, 'TrackOwl™');

// Remove UTF-8 BOM if it exists
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Encoding fixed.');
