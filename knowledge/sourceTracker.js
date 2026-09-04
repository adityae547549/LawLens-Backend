/**
 * LawLens — Official Source Tracker
 * Tracks, crawls, and monitors official Indian legal sources
 * Smart updater with change detection, diff generation, and admin notification
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SOURCES_FILE = path.join(DATA_DIR, 'source-tracker.json');
const DIFFS_DIR = path.join(DATA_DIR, 'diffs');
const CRAWL_LOG_DIR = path.join(DATA_DIR, 'crawl-logs');

// ══════════════════════════════════════════════════════════════
// OFFICIAL SOURCE DEFINITIONS
// ══════════════════════════════════════════════════════════════
const OFFICIAL_SOURCES = [
  {
    id: 'india-code',
    name: 'India Code',
    authority: 'Legislative Department, Ministry of Law and Justice',
    category: 'statute',
    baseUrl: 'https://www.indiacode.nic.in',
    sourceUrl: 'https://www.indiacode.nic.in/handle/123456789/2088',
    description: 'Complete database of all Central and State Acts of India',
    trustLevel: 'official',
    parser: 'indiacode',
    updateFrequency: 'weekly',
    tags: ['statute', 'central', 'state', 'acts', 'rules'],
    crawlConfig: {
      method: 'GET',
      headers: { 'User-Agent': 'LawLens/1.0 (Legal Research Platform)' },
      timeout: 30000,
      retries: 3
    }
  },
  {
    id: 'supreme-court',
    name: 'Supreme Court of India',
    authority: 'Supreme Court of India',
    category: 'judiciary',
    baseUrl: 'https://main.sci.gov.in',
    sourceUrl: 'https://main.sci.gov.in/judgments',
    description: 'Supreme Court judgments and orders',
    trustLevel: 'official',
    parser: 'sci',
    updateFrequency: 'daily',
    tags: ['judiciary', 'supreme-court', 'judgments', 'orders'],
    crawlConfig: {
      method: 'GET',
      headers: { 'User-Agent': 'LawLens/1.0' },
      timeout: 30000,
      retries: 3
    }
  },
  {
    id: 'delhi-high-court',
    name: 'Delhi High Court',
    authority: 'Delhi High Court',
    category: 'judiciary',
    baseUrl: 'https://delhihighcourt.nic.in',
    sourceUrl: 'https://delhihighcourt.nic.in/dhccud/',
    description: 'Delhi High Court judgments and orders',
    trustLevel: 'official',
    parser: 'highcourt',
    updateFrequency: 'daily',
    tags: ['judiciary', 'delhi', 'high-court', 'judgments'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'bombay-high-court',
    name: 'Bombay High Court',
    authority: 'Bombay High Court',
    category: 'judiciary',
    baseUrl: 'https://bombayhighcourt.nic.in',
    sourceUrl: 'https://bombayhighcourt.nic.in/',
    description: 'Bombay High Court judgments and orders',
    trustLevel: 'official',
    parser: 'highcourt',
    updateFrequency: 'daily',
    tags: ['judiciary', 'maharashtra', 'high-court', 'judgments'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'gazette',
    name: 'Gazette of India',
    authority: 'Government of India, Department of Publication',
    category: 'gazette',
    baseUrl: 'https://egazette.gov.in',
    sourceUrl: 'https://egazette.gov.in/',
    description: 'Official Gazette notifications, extraordinary notifications, and statutory notifications',
    trustLevel: 'official',
    parser: 'gazette',
    updateFrequency: 'daily',
    tags: ['gazette', 'notification', 'government', 'statutory'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'rbi',
    name: 'Reserve Bank of India',
    authority: 'Reserve Bank of India',
    category: 'regulator',
    baseUrl: 'https://www.rbi.org.in',
    sourceUrl: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx',
    description: 'RBI circulars, notifications, and regulations',
    trustLevel: 'official',
    parser: 'rbi',
    updateFrequency: 'weekly',
    tags: ['rbi', 'banking', 'finance', 'circular', 'regulation'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'sebi',
    name: 'Securities and Exchange Board of India',
    authority: 'SEBI',
    category: 'regulator',
    baseUrl: 'https://www.sebi.gov.in',
    sourceUrl: 'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doRecognisedFpi=yes&intmId=33',
    description: 'SEBI regulations, circulars, and orders',
    trustLevel: 'official',
    parser: 'sebi',
    updateFrequency: 'weekly',
    tags: ['sebi', 'securities', 'capital-market', 'regulation'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'mca',
    name: 'Ministry of Corporate Affairs',
    authority: 'Ministry of Corporate Affairs',
    category: 'regulator',
    baseUrl: 'https://www.mca.gov.in',
    sourceUrl: 'https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html',
    description: 'Companies Act, LLP Act, and corporate regulations',
    trustLevel: 'official',
    parser: 'mca',
    updateFrequency: 'monthly',
    tags: ['mca', 'companies', 'corporate', 'llp', 'regulation'],
    crawlConfig: { method: 'GET', timeout: 60000, retries: 3 }
  },
  {
    id: 'cbdt',
    name: 'Central Board of Direct Taxes',
    authority: 'Central Board of Direct Taxes, CBDT',
    category: 'tax',
    baseUrl: 'https://www.incometax.gov.in',
    sourceUrl: 'https://www.incometax.gov.in/iec/foportal/help/individual/returns-3',
    description: 'Income Tax Act, rules, circulars, and notifications',
    trustLevel: 'official',
    parser: 'cbdt',
    updateFrequency: 'weekly',
    tags: ['tax', 'income-tax', 'cbdt', 'circular', 'notification'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'cbic',
    name: 'Central Board of Indirect Taxes and Customs',
    authority: 'Central Board of Indirect Taxes and Customs',
    category: 'tax',
    baseUrl: 'https://www.cbic.gov.in',
    sourceUrl: 'https://www.cbic.gov.in/resources//htdocs-cbec/gst/gst-act.pdf',
    description: 'GST Act, Customs Act, and indirect tax regulations',
    trustLevel: 'official',
    parser: 'cbic',
    updateFrequency: 'weekly',
    tags: ['tax', 'gst', 'customs', 'cbic', 'indirect-tax'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'nclat',
    name: 'National Company Law Appellate Tribunal',
    authority: 'NCLAT',
    category: 'tribunal',
    baseUrl: 'https://nclat.nic.in',
    sourceUrl: 'https://nclat.nic.in/',
    description: 'NCLAT orders and judgments',
    trustLevel: 'official',
    parser: 'tribunal',
    updateFrequency: 'weekly',
    tags: ['nclat', 'tribunal', 'corporate', 'appellate'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'nclt',
    name: 'National Company Law Tribunal',
    authority: 'NCLT',
    category: 'tribunal',
    baseUrl: 'https://nclt.gov.in',
    sourceUrl: 'https://nclt.gov.in/',
    description: 'NCLT orders and judgments',
    trustLevel: 'official',
    parser: 'tribunal',
    updateFrequency: 'weekly',
    tags: ['nclt', 'tribunal', 'corporate'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'election-commission',
    name: 'Election Commission of India',
    authority: 'Election Commission of India',
    category: 'constitutional',
    baseUrl: 'https://eci.gov.in',
    sourceUrl: 'https://eci.gov.in/',
    description: 'Election Commission orders, notifications, and guidelines',
    trustLevel: 'official',
    parser: 'eci',
    updateFrequency: 'monthly',
    tags: ['election', 'commission', 'constitutional', 'electoral'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'law-commission',
    name: 'Law Commission of India',
    authority: 'Law Commission of India',
    category: 'advisory',
    baseUrl: 'https://lawcommissionofindia.nic.in',
    sourceUrl: 'https://lawcommissionofindia.nic.in/reports/',
    description: 'Law Commission reports and recommendations',
    trustLevel: 'official',
    parser: 'lawcommission',
    updateFrequency: 'quarterly',
    tags: ['law-commission', 'reports', 'reform', 'advisory'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'parliament',
    name: 'Parliament of India',
    authority: 'Parliament of India',
    category: 'legislature',
    baseUrl: 'https://parliamentofindia.nic.in',
    sourceUrl: 'https://parliamentofindia.nic.in/ls/debates/debates.asp',
    description: 'Parliament debates, bills, and proceedings',
    trustLevel: 'official',
    parser: 'parliament',
    updateFrequency: 'weekly',
    tags: ['parliament', 'bills', 'debates', 'proceedings', 'legislation'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'legislative-department',
    name: 'Legislative Department',
    authority: 'Legislative Department, Ministry of Law and Justice',
    category: 'statute',
    baseUrl: 'https://legislative.gov.in',
    sourceUrl: 'https://legislative.gov.in/all-acts',
    description: 'All Central Acts as enacted and amended',
    trustLevel: 'official',
    parser: 'legislative',
    updateFrequency: 'weekly',
    tags: ['statute', 'acts', 'legislative', 'central'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  },
  {
    id: 'indiakanoon',
    name: 'Indian Kanoon',
    authority: 'Indian Kanoon (Third Party Aggregator)',
    category: 'aggregator',
    baseUrl: 'https://indiankanoon.org',
    sourceUrl: 'https://indiankanoon.org/',
    description: 'Comprehensive database of Indian legal documents',
    trustLevel: 'verified',
    parser: 'kanoon',
    updateFrequency: 'daily',
    tags: ['judgments', 'statutes', 'regulations', 'aggregator'],
    crawlConfig: { method: 'GET', timeout: 30000, retries: 3 }
  }
];

class SourceTracker {
  constructor() {
    if (!fs.existsSync(DIFFS_DIR)) fs.mkdirSync(DIFFS_DIR, { recursive: true });
    if (!fs.existsSync(CRAWL_LOG_DIR)) fs.mkdirSync(CRAWL_LOG_DIR, { recursive: true });
    this._sources = this._loadSources();
  }

  _loadSources() {
    try {
      if (fs.existsSync(SOURCES_FILE)) {
        return JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
      }
    } catch {}
    // Initialize with official sources
    const sources = OFFICIAL_SOURCES.map(s => ({
      ...s,
      status: 'idle', // idle, checking, downloading, parsing, pending_review, active, error
      lastCrawled: null,
      lastModified: null,
      lastChecked: null,
      checksum: null,
      etag: null,
      version: 1,
      changeCount: 0,
      pendingDiffs: [],
      crawlHistory: [],
      errorHistory: [],
      isActive: true,
      createdAt: new Date().toISOString()
    }));
    this._saveSources(sources);
    return sources;
  }

  _saveSources(sources) {
    fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2));
  }

  /**
   * Get all tracked sources
   */
  getAllSources() {
    return this._sources;
  }

  /**
   * Get source by ID
   */
  getSource(id) {
    return this._sources.find(s => s.id === id) || null;
  }

  /**
   * Get sources by category
   */
  getByCategory(category) {
    return this._sources.filter(s => s.category === category);
  }

  /**
   * Get sources by trust level
   */
  getByTrustLevel(level) {
    return this._sources.filter(s => s.trustLevel === level);
  }

  /**
   * Get sources due for checking
   */
  getDueSources() {
    const now = new Date();
    return this._sources.filter(s => {
      if (!s.isActive || !s.updateFrequency) return false;
      if (!s.lastChecked) return true;

      const lastChecked = new Date(s.lastChecked);
      const freqMap = {
        'daily': 24 * 60 * 60 * 1000,
        'weekly': 7 * 24 * 60 * 60 * 1000,
        'monthly': 30 * 24 * 60 * 60 * 1000,
        'quarterly': 90 * 24 * 60 * 60 * 1000
      };
      const interval = freqMap[s.updateFrequency] || freqMap['weekly'];
      return (now - lastChecked) >= interval;
    });
  }

  /**
   * Check a source for changes (HEAD request for ETag/Last-Modified)
   */
  async checkSource(sourceId) {
    const source = this.getSource(sourceId);
    if (!source) throw new Error('Source not found');

    source.status = 'checking';
    source.lastChecked = new Date().toISOString();
    this._saveSources(this._sources);

    const checkResult = {
      sourceId,
      timestamp: new Date().toISOString(),
      status: 'checked',
      changed: false,
      etag: null,
      lastModified: null,
      checksum: null,
      error: null
    };

    try {
      const url = source.sourceUrl || source.baseUrl;
      const headers = {
        'User-Agent': 'LawLens/1.0 (Legal Research Platform)',
        ...(source.crawlConfig?.headers || {})
      };

      // Add conditional headers for change detection
      if (source.etag) headers['If-None-Match'] = source.etag;
      if (source.lastModified) headers['If-Modified-Since'] = source.lastModified;

      const result = await this._httpHead(url, headers);

      checkResult.etag = result.headers['etag'] || null;
      checkResult.lastModified = result.headers['last-modified'] || null;
      checkResult.statusCode = result.statusCode;

      // Detect change
      if (result.statusCode === 304) {
        // Not modified
        checkResult.changed = false;
      } else if (result.statusCode === 200) {
        // Content may have changed
        if (source.etag && result.headers['etag'] && source.etag === result.headers['etag']) {
          checkResult.changed = false;
        } else if (source.lastModified && result.headers['last-modified'] && source.lastModified === result.headers['last-modified']) {
          checkResult.changed = false;
        } else {
          checkResult.changed = true;
        }
      }

      // Update source
      if (checkResult.etag) source.etag = checkResult.etag;
      if (checkResult.lastModified) source.lastModified = checkResult.lastModified;

      source.status = checkResult.changed ? 'pending_review' : 'idle';
      source.crawlHistory.unshift({
        timestamp: checkResult.timestamp,
        changed: checkResult.changed,
        statusCode: result.statusCode
      });
      source.crawlHistory = source.crawlHistory.slice(0, 50);

      if (checkResult.changed) {
        source.changeCount = (source.changeCount || 0) + 1;
        source.pendingDiffs.push(checkResult);
      }

    } catch (err) {
      checkResult.status = 'error';
      checkResult.error = err.message;
      source.status = 'error';
      source.errorHistory.unshift({
        timestamp: checkResult.timestamp,
        error: err.message
      });
      source.errorHistory = source.errorHistory.slice(0, 20);
    }

    this._saveSources(this._sources);
    return checkResult;
  }

  /**
   * Check all due sources
   */
  async checkAllDue() {
    const due = this.getDueSources();
    const results = [];

    for (const source of due) {
      try {
        const result = await this.checkSource(source.id);
        results.push(result);
      } catch (err) {
        results.push({ sourceId: source.id, error: err.message });
      }
    }

    return {
      checked: results.length,
      changed: results.filter(r => r.changed).length,
      errors: results.filter(r => r.error).length,
      results
    };
  }

  /**
   * Approve a change (mark as reviewed)
   */
  approveChange(sourceId) {
    const source = this.getSource(sourceId);
    if (!source) return null;

    source.status = 'active';
    source.version = (source.version || 0) + 1;
    source.lastCrawled = new Date().toISOString();
    source.pendingDiffs = [];
    this._saveSources(this._sources);

    return source;
  }

  /**
   * Reject a change
   */
  rejectChange(sourceId) {
    const source = this.getSource(sourceId);
    if (!source) return null;

    source.status = 'idle';
    source.pendingDiffs = [];
    this._saveSources(this._sources);

    return source;
  }

  /**
   * Toggle source active/inactive
   */
  toggleSource(sourceId) {
    const source = this.getSource(sourceId);
    if (!source) return null;

    source.isActive = !source.isActive;
    this._saveSources(this._sources);
    return source;
  }

  /**
   * Add a custom source
   */
  addSource(sourceData) {
    const source = {
      id: sourceData.id || `custom-${Date.now()}`,
      name: sourceData.name,
      authority: sourceData.authority || '',
      category: sourceData.category || 'custom',
      baseUrl: sourceData.baseUrl || '',
      sourceUrl: sourceData.sourceUrl || '',
      description: sourceData.description || '',
      trustLevel: sourceData.trustLevel || 'unverified',
      parser: sourceData.parser || 'auto',
      updateFrequency: sourceData.updateFrequency || 'weekly',
      tags: sourceData.tags || [],
      crawlConfig: sourceData.crawlConfig || { method: 'GET', timeout: 30000, retries: 3 },
      status: 'idle',
      lastCrawled: null,
      lastModified: null,
      lastChecked: null,
      checksum: null,
      etag: null,
      version: 1,
      changeCount: 0,
      pendingDiffs: [],
      crawlHistory: [],
      errorHistory: [],
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this._sources.push(source);
    this._saveSources(this._sources);
    return source;
  }

  /**
   * Remove a source
   */
  removeSource(sourceId) {
    const idx = this._sources.findIndex(s => s.id === sourceId);
    if (idx === -1) return false;
    this._sources.splice(idx, 1);
    this._saveSources(this._sources);
    return true;
  }

  /**
   * Get tracker statistics
   */
  getStats() {
    const total = this._sources.length;
    const active = this._sources.filter(s => s.isActive).length;
    const pending = this._sources.filter(s => s.status === 'pending_review').length;
    const errors = this._sources.filter(s => s.status === 'error').length;
    const checking = this._sources.filter(s => s.status === 'checking').length;

    const byCategory = {};
    const byTrustLevel = {};
    this._sources.forEach(s => {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
      byTrustLevel[s.trustLevel] = (byTrustLevel[s.trustLevel] || 0) + 1;
    });

    const dueForCheck = this.getDueSources().length;

    return {
      total, active, pending, errors, checking, dueForCheck,
      byCategory, byTrustLevel,
      recentlyChanged: this._sources
        .filter(s => s.pendingDiffs?.length > 0)
        .map(s => ({ id: s.id, name: s.name, changes: s.pendingDiffs.length }))
    };
  }

  /**
   * HTTP HEAD request helper
   */
  _httpHead(url, headers = {}) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.request(url, {
        method: 'HEAD',
        headers,
        timeout: 15000
      }, (res) => {
        resolve({ statusCode: res.statusCode, headers: res.headers });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.end();
    });
  }
}

module.exports = SourceTracker;
