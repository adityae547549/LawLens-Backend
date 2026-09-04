/**
 * Change Detection - Smart update detection using checksums, hashes, ETags, Last-Modified
 * Only downloads and processes documents that have actually changed
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

class ChangeDetector {
  constructor(config = {}) {
    this.config = config;
    this.changeLogPath = path.join(config.dataDir || 'data', 'change-log.json');
    this.changeLog = { entries: [] };
    this.metadataCache = new Map(); // sourceId -> { etag, lastModified, checksum, lastChecked }
  }

  async initialize() {
    try {
      if (fs.existsSync(this.changeLogPath)) {
        this.changeLog = JSON.parse(fs.readFileSync(this.changeLogPath, 'utf8'));
      }
      // Load cached metadata from source registry
      const registryPath = path.join(this.config.dataDir || 'data', 'source-registry.json');
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        for (const source of registry.sources || []) {
          if (source.checksum || source.version) {
            this.metadataCache.set(source.id, {
              etag: source.etag || null,
              lastModified: source.lastModified || null,
              checksum: source.checksum || null,
              version: source.version || null,
              lastChecked: source.lastChecked || null,
            });
          }
        }
      }
    } catch (err) {
      // Initialize empty
    }
  }

  /**
   * Detect changes across all provided sources
   * Returns list of changes with status: updated, new, skipped, failed
   */
  async detectChanges(sources) {
    const changes = [];
    const concurrency = 5; // Limit concurrent checks

    for (let i = 0; i < sources.length; i += concurrency) {
      const batch = sources.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((source) => this.checkSource(source))
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          changes.push(result.value);
        }
      }
    }

    // Persist change log
    this.changeLog.entries.push({
      timestamp: new Date().toISOString(),
      totalSources: sources.length,
      changesDetected: changes.filter((c) => c.status !== 'skipped').length,
      changes,
    });

    // Keep only last 100 entries
    if (this.changeLog.entries.length > 100) {
      this.changeLog.entries = this.changeLog.entries.slice(-100);
    }

    await this.persist();
    return changes;
  }

  /**
   * Check a single source for changes
   */
  async checkSource(source) {
    if (!source.isActive) {
      return { source, status: 'skipped', reason: 'inactive' };
    }

    // Check if we have a local data file for this source
    const localDataPath = this.getLocalDataPath(source);
    const hasLocalData = fs.existsSync(localDataPath);

    // If no URL and no local data, skip
    if (!source.sourceUrl && !hasLocalData) {
      return { source, status: 'skipped', reason: 'no-source-url' };
    }

    // If no URL but has local data, check if local data needs processing
    if (!source.sourceUrl && hasLocalData) {
      const localChecksum = this.computeFileChecksum(localDataPath);
      const cached = this.metadataCache.get(source.id);

      if (cached && cached.checksum === localChecksum) {
        return { source, status: 'skipped', reason: 'unchanged' };
      }

      // Local data has changed
      return {
        source,
        status: 'updated',
        changeType: 'local-file-changed',
        newChecksum: localChecksum,
        document: this.loadLocalData(localDataPath),
      };
    }

    // Has URL - do HTTP HEAD to check for changes
    try {
      const remoteInfo = await this.checkRemote(source);
      const cached = this.metadataCache.get(source.id);

      // Check ETag
      if (remoteInfo.etag && cached?.etag && remoteInfo.etag === cached.etag) {
        return { source, status: 'skipped', reason: 'etag-match' };
      }

      // Check Last-Modified
      if (remoteInfo.lastModified && cached?.lastModified && remoteInfo.lastModified === cached.lastModified) {
        return { source, status: 'skipped', reason: 'last-modified-match' };
      }

      // Need to download
      const downloaded = await this.downloadSource(source);
      const newChecksum = this.computeBufferChecksum(downloaded);

      if (cached?.checksum === newChecksum) {
        // Content hash matches despite headers changing
        return { source, status: 'skipped', reason: 'checksum-match' };
      }

      return {
        source,
        status: 'updated',
        changeType: 'remote-changed',
        newChecksum,
        remoteInfo,
        document: downloaded,
      };
    } catch (err) {
      // If remote check fails and we have local data, use local
      if (hasLocalData) {
        return {
          source,
          status: 'updated',
          changeType: 'remote-failed-using-local',
          newChecksum: this.computeFileChecksum(localDataPath),
          document: this.loadLocalData(localDataPath),
        };
      }
      return { source, status: 'failed', error: err.message };
    }
  }

  /**
   * Check remote source headers (HEAD request)
   */
  checkRemote(source) {
    return new Promise((resolve, reject) => {
      const url = source.sourceUrl;
      const client = url.startsWith('https') ? https : http;

      const req = client.request(
        url,
        {
          method: 'HEAD',
          timeout: 15000,
          headers: {
            'User-Agent': 'LawLens-KnowledgeBot/1.0',
          },
        },
        (res) => {
          resolve({
            etag: res.headers['etag'] || null,
            lastModified: res.headers['last-modified'] || null,
            contentLength: parseInt(res.headers['content-length'] || '0'),
            contentType: res.headers['content-type'] || null,
            statusCode: res.statusCode,
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });
  }

  /**
   * Download source content
   */
  downloadSource(source) {
    return new Promise((resolve, reject) => {
      const url = source.sourceUrl;
      const client = url.startsWith('https') ? https : http;

      const req = client.get(
        url,
        {
          timeout: 30000,
          headers: {
            'User-Agent': 'LawLens-KnowledgeBot/1.0',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // Follow redirect
            return this.downloadSource({ ...source, sourceUrl: res.headers.location })
              .then(resolve)
              .catch(reject);
          }

          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Download timeout'));
      });
      req.end();
    });
  }

  /**
   * Compute checksum of a buffer
   */
  computeBufferChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Compute checksum of a file
   */
  computeFileChecksum(filePath) {
    const content = fs.readFileSync(filePath);
    return this.computeBufferChecksum(content);
  }

  /**
   * Get local data path for a source
   */
  getLocalDataPath(source) {
    return path.join(this.config.dataDir || 'data', `${source.id}.json`);
  }

  /**
   * Load local data file
   */
  loadLocalData(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }

  /**
   * Persist change log
   */
  async persist() {
    fs.writeFileSync(this.changeLogPath, JSON.stringify(this.changeLog, null, 2));
  }
}

module.exports = ChangeDetector;
