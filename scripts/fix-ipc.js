const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', 'data', 'ipc.json');
let c = fs.readFileSync(filePath, 'utf-8');

c = c.replace(/"376D"A/g, '"376DA"');
c = c.replace(/"(\d+[A-Z])"([A-Z])/g, '"$1$2"');

try {
  const parsed = JSON.parse(c);
  console.log('IPC OK -', parsed.length, 'entries');
  fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2));
} catch (e) {
  console.log('Still broken:', e.message);
  const m = e.message.match(/position (\d+)/);
  if (m) {
    const pos = parseInt(m[1]);
    console.log('Context:', c.slice(Math.max(0,pos-30), pos+30));
  }
}
