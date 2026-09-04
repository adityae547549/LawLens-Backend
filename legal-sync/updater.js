const discoverService = require('./discover');
const downloaderService = require('./downloader');
const indexerService = require('./indexer');

class UpdaterService {
  async performIncrementalSync() {
    const discovery = discoverService.discover();
    const syncResults = [];

    for (const sourceId of Object.keys(discovery.registry)) {
      const source = discovery.registry[sourceId];
      const dlResult = await downloaderService.syncDownload(source);
      syncResults.push(dlResult);
    }

    const indexStats = await indexerService.rebuildFullIndex();

    return {
      discovery,
      syncResults,
      indexStats
    };
  }
}

module.exports = new UpdaterService();
