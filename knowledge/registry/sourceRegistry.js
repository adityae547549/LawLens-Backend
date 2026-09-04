/**
 * Source Registry - Central registry for all legal data sources
 * Tracks authority, URLs, parsers, checksums, versions, and integrity status
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_SOURCES = [
  // === CONSTITUTIONAL & CENTRAL ACTS ===
  {
    id: 'india-code-constitution',
    name: 'Constitution of India',
    authority: 'Legislative Department',
    documentType: 'constitution',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_5_23_00061_19500925_1523866765688&sectionId=45892&sectionno=1',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1950-01-26',
    integrityStatus: 'pending',
    tags: ['constitutional', 'fundamental-rights', 'government'],
    isActive: true,
  },
  {
    id: 'india-code-bns',
    name: 'Bharatiya Nyaya Sanhita, 2023',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_5_23_01268_20231031_1698955813688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '2024-07-01',
    integrityStatus: 'pending',
    tags: ['criminal-law', 'penal-code', 'substantive'],
    isActive: true,
  },
  {
    id: 'india-code-bnss',
    name: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_5_23_01269_20231031_1698955813688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '2024-07-01',
    integrityStatus: 'pending',
    tags: ['criminal-procedure', 'procedural'],
    isActive: true,
  },
  {
    id: 'india-code-bsa',
    name: 'Bharatiya Sakshya Adhiniyam, 2023',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_5_23_01270_20231031_1698955813688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '2024-07-01',
    integrityStatus: 'pending',
    tags: ['evidence', 'procedural'],
    isActive: true,
  },
  {
    id: 'india-code-crpc',
    name: 'Code of Criminal Procedure, 1973',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_18_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1974-04-01',
    integrityStatus: 'pending',
    tags: ['criminal-procedure', 'procedural', 'repealed'],
    isActive: true,
  },
  {
    id: 'india-code-ipc',
    name: 'Indian Penal Code, 1860',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1860-01-01',
    integrityStatus: 'pending',
    tags: ['criminal-law', 'penal-code', 'repealed', 'historical'],
    isActive: true,
  },
  {
    id: 'india-code-iea',
    name: 'Indian Evidence Act, 1872',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1872-01-01',
    integrityStatus: 'pending',
    tags: ['evidence', 'procedural', 'repealed', 'historical'],
    isActive: true,
  },

  // === CONTRACT & COMMERCIAL ===
  {
    id: 'india-code-contract',
    name: 'Indian Contract Act, 1872',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1872-09-01',
    integrityStatus: 'pending',
    tags: ['contract', 'commercial', 'civil'],
    isActive: true,
  },
  {
    id: 'india-code-sale',
    name: 'Sale of Goods Act, 1930',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1930-07-01',
    integrityStatus: 'pending',
    tags: ['contract', 'sale', 'commercial'],
    isActive: true,
  },
  {
    id: 'india-code-partnership',
    name: 'Indian Partnership Act, 1932',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1932-10-01',
    integrityStatus: 'pending',
    tags: ['partnership', 'commercial', 'business'],
    isActive: true,
  },

  // === PROPERTY & CIVIL ===
  {
    id: 'india-code-transfer',
    name: 'Transfer of Property Act, 1882',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1882-07-01',
    integrityStatus: 'pending',
    tags: ['property', 'civil', 'real-estate'],
    isActive: true,
  },
  {
    id: 'india-code-specIFIC-relief',
    name: 'Specific Relief Act, 1963',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1964-03-01',
    integrityStatus: 'pending',
    tags: ['specific-relief', 'civil', 'injunction'],
    isActive: true,
  },
  {
    id: 'india-code-limitation',
    name: 'Limitation Act, 1963',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1963-01-01',
    integrityStatus: 'pending',
    tags: ['limitation', 'civil', 'procedure'],
    isActive: true,
  },

  // === FAMILY LAW ===
  {
    id: 'india-code-hindu',
    name: 'Hindu Marriage Act, 1955',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1955-12-21',
    integrityStatus: 'pending',
    tags: ['family', 'marriage', 'hindu-law'],
    isActive: true,
  },
  {
    id: 'india-code-muslim',
    name: 'Muslim Personal Law (Shariat) Application Act, 1937',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1937-10-07',
    integrityStatus: 'pending',
    tags: ['family', 'marriage', 'muslim-law'],
    isActive: true,
  },
  {
    id: 'india-code-maintenance',
    name: 'Section 125 CrPC (Maintenance)',
    authority: 'Legislative Department',
    documentType: 'section',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_18_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1974-04-01',
    integrityStatus: 'pending',
    tags: ['family', 'maintenance', 'protection'],
    isActive: true,
  },

  // === LABOUR ===
  {
    id: 'india-code-industrial',
    name: 'Industrial Disputes Act, 1947',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1947-03-01',
    integrityStatus: 'pending',
    tags: ['labour', 'employment', 'dispute'],
    isActive: true,
  },
  {
    id: 'india-code-shops',
    name: 'Shops and Establishments Act',
    authority: 'State Legislature',
    documentType: 'act',
    sourceUrl: null,
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: null,
    integrityStatus: 'pending',
    tags: ['labour', 'employment', 'shops'],
    isActive: false, // State-specific, needs manual source
  },

  // === TAX ===
  {
    id: 'india-code-income-tax',
    name: 'Income Tax Act, 1961',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1961-04-01',
    integrityStatus: 'pending',
    tags: ['tax', 'income-tax', 'revenue'],
    isActive: true,
  },

  // === ENVIRONMENT ===
  {
    id: 'india-code-environment',
    name: 'Environment Protection Act, 1986',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1986-05-22',
    integrityStatus: 'pending',
    tags: ['environment', 'pollution', 'conservation'],
    isActive: true,
  },

  // === CONSUMER ===
  {
    id: 'india-code-consumer',
    name: 'Consumer Protection Act, 2019',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '2019-07-20',
    integrityStatus: 'pending',
    tags: ['consumer', 'protection', 'fair-trading'],
    isActive: true,
  },

  // === RTI ===
  {
    id: 'india-code-rti',
    name: 'Right to Information Act, 2005',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '2005-06-15',
    integrityStatus: 'pending',
    tags: ['rti', 'transparency', 'governance'],
    isActive: true,
  },

  // === MOTOR VEHICLES ===
  {
    id: 'india-code-motor-vehicles',
    name: 'Motor Vehicles Act, 1988',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '1988-07-01',
    integrityStatus: 'pending',
    tags: ['motor-vehicles', 'transport', 'accident'],
    isActive: true,
  },

  // === INFORMATION TECHNOLOGY ===
  {
    id: 'india-code-it',
    name: 'Information Technology Act, 2000',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '2000-05-17',
    integrityStatus: 'pending',
    tags: ['technology', 'cyber', 'data-protection'],
    isActive: true,
  },

  // === GST ===
  {
    id: 'india-code-cgst',
    name: 'Central Goods and Services Tax Act, 2017',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_5_23_00755_20170606_1517805765690',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '2017-07-01',
    integrityStatus: 'pending',
    tags: ['gst', 'tax', 'indirect-tax'],
    isActive: true,
  },

  // === COMPANIES ===
  {
    id: 'india-code-companies',
    name: 'Companies Act, 2013',
    authority: 'Legislative Department',
    documentType: 'act',
    sourceUrl: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_2_19_19730201_1523266765688',
    parser: 'indiacode',
    updateFrequency: 'monthly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: '2013-09-12',
    integrityStatus: 'pending',
    tags: ['companies', 'corporate', 'business'],
    isActive: true,
  },

  // === SUPREME COURT CASES ===
  {
    id: 'sci-judgments',
    name: 'Supreme Court of India Judgments',
    authority: 'Supreme Court of India',
    documentType: 'judgment',
    sourceUrl: 'https://main.sci.gov.in/judgments',
    parser: 'sci',
    updateFrequency: 'daily',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: null,
    integrityStatus: 'pending',
    tags: ['judgments', 'supreme-court', 'precedent'],
    isActive: true,
  },

  // === GAZETTE ===
  {
    id: 'egazette',
    name: 'eGazette Notifications',
    authority: 'Government of India',
    documentType: 'notification',
    sourceUrl: 'https://egazette.gov.in/',
    parser: 'egazette',
    updateFrequency: 'weekly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: null,
    integrityStatus: 'pending',
    tags: ['notifications', 'amendments', 'gazette'],
    isActive: true,
  },

  // === REGULATORY BODIES ===
  {
    id: 'rbi-notifications',
    name: 'RBI Notifications and Circulars',
    authority: 'Reserve Bank of India',
    documentType: 'notification',
    sourceUrl: 'https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx',
    parser: 'rbi',
    updateFrequency: 'weekly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: null,
    integrityStatus: 'pending',
    tags: ['rbi', 'banking', 'finance', 'circulars'],
    isActive: true,
  },
  {
    id: 'sebi-notifications',
    name: 'SEBI Notifications and Orders',
    authority: 'Securities and Exchange Board of India',
    documentType: 'notification',
    sourceUrl: 'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doRecognisedFpi=yes&intmId=33',
    parser: 'sebi',
    updateFrequency: 'weekly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: null,
    integrityStatus: 'pending',
    tags: ['sebi', 'securities', 'market', 'regulation'],
    isActive: true,
  },
  {
    id: 'mca-notifications',
    name: 'MCA Notifications and Circulars',
    authority: 'Ministry of Corporate Affairs',
    documentType: 'notification',
    sourceUrl: 'https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html',
    parser: 'mca',
    updateFrequency: 'weekly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: null,
    integrityStatus: 'pending',
    tags: ['mca', 'corporate', 'compliance'],
    isActive: true,
  },
  {
    id: 'cbic-notifications',
    name: 'CBIC Notifications and Circulars',
    authority: 'Central Board of Indirect Taxes and Customs',
    documentType: 'notification',
    sourceUrl: 'https://cbic-gst.gov.in/cbic-gst/cbic/notification.html',
    parser: 'cbic',
    updateFrequency: 'weekly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: null,
    integrityStatus: 'pending',
    tags: ['cbic', 'customs', 'gst', 'indirect-tax'],
    isActive: true,
  },
  {
    id: 'cbdt-notifications',
    name: 'CBDT Notifications and Circulars',
    authority: 'Central Board of Direct Taxes',
    documentType: 'notification',
    sourceUrl: 'https://www.incometaxindia.gov.in/charts%20%20tables/notifications.htm',
    parser: 'cbdt',
    updateFrequency: 'weekly',
    checksum: null,
    version: null,
    lastChecked: null,
    lastDownloaded: null,
    effectiveDate: null,
    integrityStatus: 'pending',
    tags: ['cbdt', 'income-tax', 'direct-tax'],
    isActive: true,
  },
];

class SourceRegistry {
  constructor(config = {}) {
    this.config = config;
    this.registryPath = path.join(config.dataDir || 'data', 'source-registry.json');
    this.sources = new Map();
  }

  async initialize() {
    try {
      if (fs.existsSync(this.registryPath)) {
        const data = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        for (const source of data.sources || []) {
          this.sources.set(source.id, source);
        }
      }

      // Also import from existing legal-sync registry if available
      const legalSyncRegistryPath = path.join(this.config.dataDir || 'data', '..', 'legal-sync', 'registry.json');
      if (fs.existsSync(legalSyncRegistryPath)) {
        const legalSyncRegistry = JSON.parse(fs.readFileSync(legalSyncRegistryPath, 'utf8'));
        for (const [id, entry] of Object.entries(legalSyncRegistry)) {
          if (!this.sources.has(id)) {
            this.sources.set(id, {
              id: entry.id,
              name: entry.title,
              authority: entry.source,
              documentType: entry.category || 'act',
              parser: 'indiacode',
              sourceUrl: entry.officialUrl,
              updateFrequency: 'monthly',
              checksum: entry.documentHash,
              version: entry.version,
              lastChecked: entry.lastChecked,
              lastDownloaded: entry.lastChecked,
              effectiveDate: entry.year ? `${entry.year}-01-01` : null,
              integrityStatus: entry.status === 'synced' ? 'verified' : 'pending',
              tags: [entry.category],
              isActive: true,
              localFile: entry.localFile,
            });
          }
        }
      }

      // Seed defaults for any missing sources
      for (const source of DEFAULT_SOURCES) {
        if (!this.sources.has(source.id)) {
          this.sources.set(source.id, { ...source });
        }
      }
      await this.persist();
    } catch (err) {
      // Initialize with defaults
      for (const source of DEFAULT_SOURCES) {
        this.sources.set(source.id, { ...source });
      }
      await this.persist();
    }
  }

  async addSource(source) {
    if (!source.id) {
      source.id = `source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    source.createdAt = source.createdAt || new Date().toISOString();
    source.updatedAt = new Date().toISOString();
    this.sources.set(source.id, source);
    await this.persist();
    return source;
  }

  async getSource(id) {
    return this.sources.get(id) || null;
  }

  async getAllSources() {
    return Array.from(this.sources.values());
  }

  async getActiveSources() {
    return Array.from(this.sources.values()).filter((s) => s.isActive);
  }

  async getSourcesByType(type) {
    return Array.from(this.sources.values()).filter((s) => s.documentType === type);
  }

  async getSourcesByAuthority(authority) {
    return Array.from(this.sources.values()).filter((s) => s.authority === authority);
  }

  async updateSource(id, updates) {
    const source = this.sources.get(id);
    if (!source) throw new Error(`Source not found: ${id}`);
    Object.assign(source, updates, { updatedAt: new Date().toISOString() });
    this.sources.set(id, source);
    await this.persist();
    return source;
  }

  async updateChecksum(id, checksum) {
    const source = this.sources.get(id);
    if (!source) throw new Error(`Source not found: ${id}`);
    source.checksum = checksum;
    source.lastChecked = new Date().toISOString();
    source.integrityStatus = 'verified';
    this.sources.set(id, source);
    await this.persist();
  }

  async removeSource(id) {
    this.sources.delete(id);
    await this.persist();
  }

  async getStats() {
    const sources = Array.from(this.sources.values());
    const byType = {};
    const byAuthority = {};
    const byStatus = { verified: 0, pending: 0, failed: 0 };

    for (const s of sources) {
      byType[s.documentType] = (byType[s.documentType] || 0) + 1;
      byAuthority[s.authority] = (byAuthority[s.authority] || 0) + 1;
      byStatus[s.integrityStatus] = (byStatus[s.integrityStatus] || 0) + 1;
    }

    return {
      total: sources.length,
      active: sources.filter((s) => s.isActive).length,
      inactive: sources.filter((s) => !s.isActive).length,
      byType,
      byAuthority,
      byIntegrityStatus: byStatus,
    };
  }

  async persist() {
    const data = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      sources: Array.from(this.sources.values()),
    };
    fs.writeFileSync(this.registryPath, JSON.stringify(data, null, 2));
  }
}

module.exports = SourceRegistry;
