const fs = require('fs');
const path = require('path');
const { REPORTS_DIR, DATA_DIR, OFFICIAL_SOURCES } = require('./config');

class ReporterService {
  generateReport(syncData) {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(REPORTS_DIR, `sync-report-${timestamp}.json`);

    const registeredFiles = OFFICIAL_SOURCES.map(s => s.localFile);
    const allLocalFiles = fs.readdirSync(DATA_DIR);
    const skippedDatasets = allLocalFiles.filter(f => !registeredFiles.includes(f));

    const downloadedDatasets = syncData.syncResults
      .filter(r => r.status === 'downloaded')
      .map(r => r.source);

    const missingDatasets = syncData.syncResults
      .filter(r => r.status === 'missing_requires_manual_download' || r.status === 'failed')
      .map(r => r.source);

    const updatedDatasets = syncData.discovery.changes.updatedActs;

    const reportContent = {
      timestamp: new Date().toISOString(),
      documentsScanned: Object.keys(syncData.discovery.registry).length,
      missingDatasets,
      downloadedDatasets,
      updatedDatasets,
      skippedDatasets,
      indexing: syncData.indexStats,
      status: 'SUCCESS'
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportContent, null, 2));
    return { reportPath, summary: reportContent };
  }
}

module.exports = new ReporterService();
