require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const updaterService = require('./updater');
const reporterService = require('./reporter');
const discoverService = require('./discover');
const indexerService = require('./indexer');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '--sync';

  console.log('====================================================');
  console.log(' LawLens Automated Legal Corpus Builder & Sync System ');
  console.log('====================================================');

  if (command === '--audit' || command === 'audit') {
    const discovery = discoverService.discover();
    console.log('\n--- LEGAL SOURCES REGISTRY AUDIT ---');
    console.table(discovery.registry);
    return;
  }

  if (command === '--validate' || command === 'validate') {
    const discovery = discoverService.discover();
    console.log('\n✓ Validated registered official legal sources.');
    console.log(`- New Acts    : ${discovery.changes.newActs.length}`);
    console.log(`- Updated Acts: ${discovery.changes.updatedActs.length}`);
    console.log(`- Synced Acts : ${discovery.changes.unchangedActs.length}`);
    return;
  }

  if (command === '--rebuild' || command === 'rebuild') {
    console.log('\nRebuilding retrieval index from legal corpus...');
    const stats = await indexerService.rebuildFullIndex();
    console.log(`✓ Rebuild complete. Total indexed chunks: ${stats.totalChunks} (Duration: ${stats.durationMs}ms)`);
    return;
  }

  // Default: --sync
  console.log('\nStarting legal corpus discovery and synchronization...');
  const syncData = await updaterService.performIncrementalSync();
  const { reportPath, summary } = reporterService.generateReport(syncData);

  console.log('\n✓ Legal Corpus Sync Completed Successfully!');
  console.log(`- Documents Scanned  : ${summary.documentsScanned}`);
  console.log(`- Downloaded/Restored: ${summary.downloadedDatasets.length > 0 ? summary.downloadedDatasets.join(', ') : 'None'}`);
  console.log(`- Updated Datasets   : ${summary.updatedDatasets.length > 0 ? summary.updatedDatasets.join(', ') : 'None'}`);
  console.log(`- Missing Datasets   : ${summary.missingDatasets.length > 0 ? summary.missingDatasets.join(', ') : 'None'}`);
  console.log(`- Skipped Unregistered: ${summary.skippedDatasets.length > 0 ? summary.skippedDatasets.join(', ') : 'None'}`);
  console.log(`- Total Chunks       : ${summary.indexing.totalChunks}`);
  console.log(`- Indexing Duration  : ${summary.indexing.durationMs} ms`);
  console.log(`- Report Generated   : ${reportPath}`);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Legal sync error:', err);
  process.exit(1);
});
