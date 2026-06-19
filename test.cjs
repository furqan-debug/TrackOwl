const fs = require('fs');
const text = fs.readFileSync('C:/Users/KNA/.gemini/antigravity/brain/30749036-b24b-4d1e-866c-18e34efceb54/.system_generated/steps/3141/output.txt', 'utf8');
const data = JSON.parse(text);
const logs = data.result || [];
const items = Array.isArray(logs) ? logs : logs.result || logs.data || [];
console.log(items.length > 0 ? items[0] : 'no items');
