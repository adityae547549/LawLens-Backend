const fs = require('fs');
const path = require('path');

function fixJsonFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  // Fix chapter values like 5A -> "5A"
  content = content.replace(/"chapter":(\d+[A-Za-z]+)/g, '"chapter":"$1"');
  // Fix section num values like 376DA -> "376DA"
  content = content.replace(/"num":(\d+[A-Za-z]+)/g, '"num":"$1"');
  content = content.replace(/"num":([A-Za-z]\d+)/g, '"num":"$1"');
  fs.writeFileSync(filePath, content);
  try {
    JSON.parse(content);
    console.log('  OK (' + JSON.parse(content).length + ' entries)');
  } catch (e) {
    console.log('  FAIL:', e.message.slice(0, 150));
    // Show context
    const m = e.message.match(/position (\d+)/);
    if (m) {
      const pos = parseInt(m[1]);
      console.log('  Context:', JSON.stringify(content.slice(Math.max(0,pos-30), pos+30)));
    }
  }
}

const dataDir = path.resolve(__dirname, '..', 'data');
const files = ['ipc.json', 'crpc.json', 'evidence-act.json'];
files.forEach(f => {
  const fp = path.join(dataDir, f);
  if (fs.existsSync(fp)) {
    console.log('Fixing', f);
    fixJsonFile(fp);
  }
});
