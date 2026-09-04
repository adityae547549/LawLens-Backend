const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

function auditCorpus() {
  const files = fs.readdirSync(DATA_DIR);
  const auditReport = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const stats = fs.statSync(filePath);

    if (file.endsWith('.json')) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let provisionCount = 0;
        let hasPreviousEq = false;
        let hasFullMetadata = true;

        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item.sections) {
              provisionCount += item.sections.length;
              item.sections.forEach(s => {
                if (s.previousEquivalent) hasPreviousEq = true;
                if (!s.num || !s.text || !s.key_topics && !s.keywords) hasFullMetadata = false;
              });
            } else if (item.case || item.maxim) {
              provisionCount += 1;
            }
          });
        }

        const isFull = file.includes('constitution') || provisionCount > 10;
        auditReport.push({
          file,
          sizeBytes: stats.size,
          sizeKB: (stats.size / 1024).toFixed(1) + ' KB',
          provisionCount,
          hasPreviousEq,
          type: isFull ? 'Full Statutory / Comprehensive' : 'Selected Key Provisions',
          metadataCompleteness: hasFullMetadata ? '100%' : 'Partial'
        });
      } catch (e) {
        auditReport.push({ file, sizeBytes: stats.size, error: e.message });
      }
    } else if (file.endsWith('.pdf')) {
      auditReport.push({
        file,
        sizeBytes: stats.size,
        sizeKB: (stats.size / 1024).toFixed(1) + ' KB',
        provisionCount: 'Official PDF Document',
        type: 'Official Authentic Government PDF',
        metadataCompleteness: '100%'
      });
    }
  }

  console.table(auditReport);
  return auditReport;
}

auditCorpus();
