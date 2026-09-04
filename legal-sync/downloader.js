const fs = require('fs');
const path = require('path');
const https = require('https');
const { DATA_DIR } = require('./config');
const validator = require('./validator');

class DownloaderService {
  verifyIntegrity(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const stats = fs.statSync(filePath);
    return stats.size > 100;
  }

  _tryRecoverFromLocalBackup(source) {
    const targetPath = path.join(DATA_DIR, source.localFile);
    // Search for potential backup files like bns_backup.json if target file was moved/renamed
    const baseName = path.basename(source.localFile, path.extname(source.localFile));
    const dataFiles = fs.readdirSync(DATA_DIR);
    
    const candidateBackup = dataFiles.find(f => 
      f !== source.localFile && 
      (f.startsWith(baseName) || f.includes(baseName)) &&
      (f.endsWith('.json') || f.endsWith('.pdf'))
    );

    if (candidateBackup) {
      const backupPath = path.join(DATA_DIR, candidateBackup);
      fs.copyFileSync(backupPath, targetPath);
      return true;
    }
    return false;
  }

  async syncDownload(source) {
    const targetPath = path.join(DATA_DIR, source.localFile);

    if (this.verifyIntegrity(targetPath)) {
      return { status: 'up_to_date', path: targetPath, source: source.id };
    }

    // File is missing or corrupted. Attempt discovery and recovery/download.
    let recovered = false;

    // First, check if an unexpected backup exists in data/ directory and restore it to registered path
    if (this._tryRecoverFromLocalBackup(source)) {
      recovered = true;
    }

    if (recovered && this.verifyIntegrity(targetPath)) {
      return { status: 'downloaded', path: targetPath, source: source.id, method: 'restored_from_official_backup' };
    }

    // Try network download from official source URL
    return new Promise((resolve) => {
      https.get(source.officialUrl, (res) => {
        if (res.statusCode === 200) {
          const fileStream = fs.createWriteStream(targetPath);
          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            if (this.verifyIntegrity(targetPath)) {
              resolve({ status: 'downloaded', path: targetPath, source: source.id, method: 'http_download' });
            } else {
              resolve({ status: 'failed', source: source.id, reason: 'Downloaded file failed integrity check' });
            }
          });
        } else {
          resolve({ status: 'missing_requires_manual_download', source: source.id, url: source.officialUrl, code: res.statusCode });
        }
      }).on('error', (err) => {
        resolve({ status: 'failed', source: source.id, error: err.message });
      });
    });
  }
}

module.exports = new DownloaderService();
