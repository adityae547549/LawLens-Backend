const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { OFFICIAL_SOURCES, DATA_DIR, REGISTRY_FILE } = require('./config');

class DiscoveryService {
  _computeHash(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  loadRegistry() {
    if (fs.existsSync(REGISTRY_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  saveRegistry(registry) {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
  }

  discover() {
    const existingRegistry = this.loadRegistry();
    const updatedRegistry = {};
    const changes = {
      newActs: [],
      updatedActs: [],
      unchangedActs: [],
      missingFiles: []
    };

    for (const source of OFFICIAL_SOURCES) {
      const localFilePath = path.join(DATA_DIR, source.localFile);
      const exists = fs.existsSync(localFilePath);
      const currentHash = exists ? this._computeHash(localFilePath) : null;
      const prevEntry = existingRegistry[source.id];

      let status = 'synced';
      if (!exists) {
        status = 'missing';
        changes.missingFiles.push(source.id);
      } else if (!prevEntry) {
        status = 'new';
        changes.newActs.push(source.id);
      } else if (prevEntry.documentHash !== currentHash) {
        status = 'updated';
        changes.updatedActs.push(source.id);
      } else {
        changes.unchangedActs.push(source.id);
      }

      updatedRegistry[source.id] = {
        ...source,
        documentHash: currentHash,
        lastChecked: new Date().toISOString(),
        version: prevEntry ? (status === 'updated' ? prevEntry.version + 1 : prevEntry.version) : 1,
        status
      };
    }

    this.saveRegistry(updatedRegistry);
    return { registry: updatedRegistry, changes };
  }
}

module.exports = new DiscoveryService();
