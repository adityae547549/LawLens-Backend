/**
 * Legal Synonym Engine - Comprehensive legal term expansion
 * Supports: abbreviations, aliases, historical names, multilingual terminology,
 * cross-references between old and new laws
 */

const fs = require('fs');
const path = require('path');

class LegalSynonymEngine {
  constructor(config = {}) {
    this.config = config;
    this.synonymGroups = new Map();
    this.expansionCache = new Map();
    this.indexPath = path.join(config.dataDir || 'data', 'synonym-index.json');

    // Initialize with comprehensive legal synonyms
    this._initializeSynonyms();
  }

  async initialize() {
    // Synonyms are already initialized in constructor
    // Just load any additional from disk
    await this.load();
  }

  _initializeSynonyms() {
    // === IPC → BNS MAPPINGS ===
    this.addGroup('murder', [
      'murder', 'ipc 302', 'ipc section 302', 'section 302 ipc',
      'bns 103', 'bns section 103', 'section 103 bns',
      'punishment for murder', 'culpable homicide amounting to murder',
      'bharatiya nyaya sanhita section 103',
    ]);
    this.addGroup('culpable-homicide', [
      'culpable homicide', 'ipc 304', 'ipc section 304', 'section 304 ipc',
      'bns 105', 'bns section 105', 'section 105 bns',
      'culpable homicide not amounting to murder',
    ]);
    this.addGroup('rape', [
      'rape', 'ipc 376', 'ipc section 376', 'section 376 ipc',
      'bns 63', 'bns section 63', 'section 63 bns',
      'sexual assault', 'rape punishment',
    ]);
    this.addGroup('theft', [
      'theft', 'ipc 379', 'ipc section 379', 'section 379 ipc',
      'bns 303', 'bns section 303', 'section 303 bns',
      'dishonest taking of movable property', 'stealing',
    ]);
    this.addGroup('cheating', [
      'cheating', 'ipc 420', 'ipc section 420', 'section 420 ipc',
      'bns 318', 'bns section 318', 'section 318 bns',
      'fraud', 'deception', 'dishonest inducement',
    ]);
    this.addGroup('criminal-breach-of-trust', [
      'criminal breach of trust', 'ipc 405', 'ipc section 405', 'section 405 ipc',
      'bns 316', 'bns section 316', 'section 316 bns',
    ]);
    this.addGroup('dacoity', [
      'dacoity', 'ipc 395', 'ipc section 395', 'section 395 ipc',
      'bns 309', 'bns section 309', 'section 309 bns',
      'robbery by group', 'gang robbery',
    ]);
    this.addGroup('robbery', [
      'robbery', 'ipc 392', 'ipc section 392', 'section 392 ipc',
      'bns 309', 'bns section 309', 'section 309 bns',
    ]);
    this.addGroup('kidnapping', [
      'kidnapping', 'ipc 359', 'ipc section 359', 'section 359 ipc',
      'bns 137', 'bns section 137', 'section 137 bns',
      'abduction', 'forced confinement',
    ]);
    this.addGroup('dowry-death', [
      'dowry death', 'ipc 304b', 'ipc section 304b', 'section 304b ipc',
      'bns 80', 'bns section 80', 'section 80 bns',
      'dowry', 'death within seven years',
    ]);
    this.addGroup('cruelty', [
      'cruelty', 'ipc 498a', 'ipc section 498a', 'section 498a ipc',
      'bns 85', 'bns section 85', 'section 85 bns',
      'cruelty by husband', 'domestic violence', 'matrimonial cruelty',
    ]);

    // === CrPC → BNSS MAPPINGS ===
    this.addGroup('fir', [
      'fir', 'first information report', 'first information',
      'crpc 154', 'crpc section 154', 'section 154 crpc',
      'bnss 173', 'bnss section 173', 'section 173 bnss',
      'information in cognizable cases',
    ]);
    this.addGroup('anticipatory-bail', [
      'anticipatory bail', 'section 438 crpc', 'crpc 438',
      'crpc section 438', 'section 438',
      'bnss 482', 'bnss section 482', 'section 482 bnss',
      'arrest before arrest', 'pre-arrest bail',
    ]);
    this.addGroup('bail', [
      'bail', 'regular bail', 'default bail', 'statutory bail',
      'crpc 437', 'crpc section 437', 'section 437 crpc',
      'bnss 480', 'bnss section 480', 'section 480 bnss',
      'release on bail', 'bail application',
    ]);
    this.addGroup('charge', [
      'charge', 'framing of charge', 'chargesheet', 'challan',
      'crpc 173', 'crpc section 173', 'section 173 crpc',
      'bnss 193', 'bnss section 193', 'section 193 bnss',
      'police report', 'final report',
    ]);
    this.addGroup('cognizable-offence', [
      'cognizable offence', 'cognizable case', 'cognizable crime',
      'non-cognizable offence', 'non-cognizable case',
      'bailable offence', 'non-bailable offence',
    ]);
    this.addGroup('remand', [
      'remand', 'police custody', 'judicial custody', 'production before magistrate',
      'crpc 167', 'crpc section 167', 'section 167 crpc',
      'bnss 187', 'bnss section 187', 'section 187 bnss',
    ]);
    this.addGroup('trial', [
      'trial', 'summons case', 'warrant case', 'sessions trial',
      'summary trial', 'trial procedure', 'examination of accused',
    ]);

    // === EVIDENCE ACT → BSA MAPPINGS ===
    this.addGroup('electronic-evidence', [
      'electronic evidence', 'electronic record', 'digital evidence',
      'evidence act 65b', 'section 65b evidence act', '65b certificate',
      'bsa 61', 'bsa section 61', 'section 61 bsa',
      'admissibility of electronic records',
    ]);
    this.addGroup('dying-declaration', [
      'dying declaration', 'statement before death',
      'evidence act 32', 'section 32 evidence act',
      'bsa 26', 'bsa section 26', 'section 26 bsa',
    ]);
    this.addGroup('expert-evidence', [
      'expert evidence', 'expert opinion', 'expert witness',
      'evidence act 45', 'section 45 evidence act',
      'bsa 39', 'bsa section 39', 'section 39 bsa',
    ]);
    this.addGroup('confession', [
      'confession', 'extra-judicial confession', 'retracted confession',
      'evidence act 24-30', 'bsa 22-25',
      'confession to police', 'confession before magistrate',
    ]);
    this.addGroup('documentary-evidence', [
      'documentary evidence', 'primary evidence', 'secondary evidence',
      'evidence act 61-65', 'bsa 57-61',
      'certified copy', 'true copy', 'attested copy',
    ]);

    // === CONSTITUTIONAL TERMS ===
    this.addGroup('fundamental-rights', [
      'fundamental rights', 'part iii', 'part 3', 'chapter iii', 'chapter 3',
      'articles 12-35', 'articles 14, 19, 21',
      'right to equality', 'right to freedom', 'right against exploitation',
      'right to freedom of religion', 'cultural and educational rights',
      'right to property', 'right to constitutional remedies',
    ]);
    this.addGroup('article-21', [
      'article 21', 'art 21', 'art. 21',
      'right to life', 'right to personal liberty', 'right to life and personal liberty',
      'protection of life and personal liberty',
    ]);
    this.addGroup('article-14', [
      'article 14', 'art 14', 'art. 14',
      'equality before law', 'equal protection of laws',
      'right to equality',
    ]);
    this.addGroup('article-19', [
      'article 19', 'art 19', 'art. 19',
      'freedom of speech', 'freedom of expression', 'freedom of assembly',
      'freedom of association', 'freedom of movement', 'freedom of residence',
      'freedom of profession',
      'article 19(1)(a)', 'article 19(1)(b)', 'article 19(1)(c)',
    ]);
    this.addGroup('writ-jurisdiction', [
      'writ', 'habeas corpus', 'mandamus', 'prohibition', 'certiorari', 'quo warranto',
      'article 32', 'article 226',
      'supreme court writ', 'high court writ', 'writ petition',
    ]);
    this.addGroup('basic-structure', [
      'basic structure', 'basic structure doctrine',
      'kesavananda bharati', 'doctrine of basic structure',
      'parliamentary sovereignty', 'constitutional amendability',
    ]);
    this.addGroup('right-to-privacy', [
      'right to privacy', 'privacy', 'puttaswamy',
      'informational privacy', 'data privacy', 'digital privacy',
      'right to be forgotten', 'right to data protection',
    ]);

    // === CONTRACT LAW TERMS ===
    this.addGroup('consideration', [
      'consideration', 'contract act 2(d)', 'section 2d contract act',
      'contract act section 2', 'price', 'recompense', 'quid pro quo',
    ]);
    this.addGroup('void-agreement', [
      'void agreement', 'void contract', 'void ab initio',
      'contract act 2(g)', 'section 2g contract act',
      'contract act section 23', 'unlawful consideration',
    ]);
    this.addGroup('specific-performance', [
      'specific performance', 'specific relief act', 'section 10 specific relief act',
      'specific relief act 10', 'injunction', 'damages in lieu',
    ]);

    // === PROPERTY LAW TERMS ===
    this.addGroup('transfer-of-property', [
      'transfer of property', 'transfer of property act', 'topa',
      'section 5 transfer of property act', 'transfer of property act section 5',
      'sale', 'mortgage', 'lease', 'gift', 'actionable claim',
    ]);
    this.addGroup('mortgage', [
      'mortgage', 'mortgagee', 'mortgagor', 'mortgage deed',
      'simple mortgage', 'mortgage by conditional sale',
      'usufructuary mortgage', 'english mortgage',
      'section 58 transfer of property act',
    ]);

    // === FAMILY LAW TERMS ===
    this.addGroup('divorce', [
      'divorce', 'dissolution of marriage', 'matrimonial',
      'hindu marriage act section 13', 'section 13 hindu marriage act',
      'irretrievable breakdown', 'cruelty', 'desertion',
      'mutual consent divorce', 'contested divorce',
    ]);
    this.addGroup('maintenance', [
      'maintenance', 'alimony', 'spousal support',
      'section 125 crpc', 'crpc 125', 'section 125 bnss',
      'bnss 144', 'hindu maintenance and welfare act',
      'women right to maintenance',
    ]);
    this.addGroup('custody', [
      'custody', 'child custody', 'guardianship',
      'guardian and wards act', 'hindu minority and guardianship act',
      'best interest of child', 'welfare of minor',
    ]);

    // === CYBER LAW TERMS ===
    this.addGroup('data-protection', [
      'data protection', 'data privacy', 'personal data',
      'dpdp act', 'digital personal data protection act',
      'data fiduciary', 'data principal', 'consent',
      'right to erasure', 'right to data portability',
    ]);
    this.addGroup('cybercrime', [
      'cybercrime', 'cyber crime', 'computer crime',
      'hacking', 'phishing', 'identity theft', 'malware',
      'it act section 43', 'it act section 66',
      'section 43 it act', 'section 66 it act',
      'unauthorized access', 'computer fraud',
    ]);
    this.addGroup('electronic-signature', [
      'electronic signature', 'digital signature', 'e-sign',
      'it act section 3a', 'it act section 5',
      'section 3a it act', 'section 5 it act',
      'adhaar e-sign', 'dsc',
    ]);

    // === LABOUR LAW TERMS ===
    this.addGroup('industrial-dispute', [
      'industrial dispute', 'industrial disputes act',
      'strike', 'lockout', 'lay-off', 'retrenchment',
      'section 2a industrial disputes act',
      'reference to tribunal', 'conciliation', 'adjudication',
    ]);
    this.addGroup('sexual-harassment', [
      'sexual harassment', 'sexual harassment at workplace',
      'posh act', 'internal complaints committee',
      'vishaka guidelines', 'workplace harassment',
      'section 354d ipc', 'section 75 bns',
    ]);

    // === RTI TERMS ===
    this.addGroup('rti', [
      'rti', 'right to information', 'right to information act',
      'rti act', 'section 6 rti', 'section 7 rti',
      'public authority', 'information commissioner',
      'first appeal', 'second appeal', 'cic', 'sicc',
      'transparency', 'disclosure',
    ]);

    // === TAX TERMS ===
    this.addGroup('gst', [
      'gst', 'goods and services tax', 'gst act',
      'cgst', 'sgst', 'igst', 'utgst',
      'input tax credit', 'itc', 'gst registration',
      'gst return', 'gstr-1', 'gstr-3b',
    ]);
    this.addGroup('income-tax', [
      'income tax', 'income tax act', 'ita',
      'assessment year', 'previous year', 'taxable income',
      'section 80c', 'section 80d', 'section 194',
      'tds', 'advance tax', 'self-assessment',
    ]);

    // === CONSUMER LAW TERMS ===
    this.addGroup('consumer-complaint', [
      'consumer complaint', 'consumer protection act',
      'district commission', 'state commission', 'national commission',
      'deficiency in service', 'defect in goods',
      'unfair trade practice', 'restrictive trade practice',
    ]);

    // === GENERAL LEGAL TERMS ===
    this.addGroup('bail', [
      'bail', 'regular bail', 'anticipatory bail', 'default bail',
      'statutory bail', 'interim bail', 'bail conditions',
      'bail application', 'bail bond',
    ]);
    this.addGroup('jurisdiction', [
      'jurisdiction', 'territorial jurisdiction', 'pecuniary jurisdiction',
      'original jurisdiction', 'appellate jurisdiction',
      'revisional jurisdiction', 'concurrent jurisdiction',
    ]);
    this.addGroup('limitation', [
      'limitation', 'limitation act', 'limitation period',
      'section 3 limitation act', 'adverse possession',
      'prescription', 'time-barred',
    ]);
    this.addGroup('injunction', [
      'injunction', 'temporary injunction', 'permanent injunction',
      'interim injunction', 'stay order',
      'specific relief act section 36-42',
    ]);
    this.addGroup('damages', [
      'damages', 'compensation', 'exemplary damages',
      'liquidated damages', 'consequential damages',
      'section 73 contract act', 'section 74 contract act',
    ]);
    this.addGroup('arbitration', [
      'arbitration', 'arbitral tribunal', 'arbitration award',
      'arbitration act', 'section 34 arbitration act',
      'section 9 arbitration act', 'section 11 arbitration act',
      'conciliation', 'mediation',
    ]);
  }

  /**
   * Add a synonym group
   */
  addGroup(conceptId, synonyms) {
    const group = {
      conceptId,
      synonyms: synonyms.map((s) => s.toLowerCase()),
      createdAt: new Date().toISOString(),
    };
    this.synonymGroups.set(conceptId, group);

    // Index: each synonym maps to the concept
    for (const syn of synonyms) {
      this.expansionCache.set(syn.toLowerCase(), conceptId);
    }
  }

  /**
   * Expand a query with synonyms
   */
  expandQuery(query) {
    const words = query.toLowerCase().split(/\s+/);
    const expandedTerms = new Set(words);

    // Check each word against synonym cache
    for (const word of words) {
      if (this.expansionCache.has(word)) {
        const conceptId = this.expansionCache.get(word);
        const group = this.synonymGroups.get(conceptId);
        if (group) {
          for (const syn of group.synonyms) {
            expandedTerms.add(syn);
          }
        }
      }
    }

    // Check multi-word phrases
    for (const [conceptId, group] of this.synonymGroups) {
      const queryLower = query.toLowerCase();
      for (const syn of group.synonyms) {
        if (syn.length > 5 && queryLower.includes(syn)) {
          for (const s of group.synonyms) {
            expandedTerms.add(s);
          }
          break;
        }
      }
    }

    // Return original + expanded
    return Array.from(expandedTerms).join(' ');
  }

  /**
   * Find synonyms for a term
   */
  findSynonyms(term) {
    const lower = term.toLowerCase();
    const conceptId = this.expansionCache.get(lower);
    if (conceptId) {
      return this.synonymGroups.get(conceptId)?.synonyms || [];
    }

    // Partial match
    for (const [syn, cid] of this.expansionCache) {
      if (syn.includes(lower) || lower.includes(syn)) {
        return this.synonymGroups.get(cid)?.synonyms || [];
      }
    }

    return [];
  }

  /**
   * Find related concepts
   */
  findRelated(conceptId) {
    const group = this.synonymGroups.get(conceptId);
    if (!group) return [];

    const related = [];
    for (const [otherId, otherGroup] of this.synonymGroups) {
      if (otherId === conceptId) continue;

      // Check for overlap in synonyms
      const overlap = group.synonyms.filter((s) => otherGroup.synonyms.includes(s));
      if (overlap.length > 0) {
        related.push({ conceptId: otherId, overlap });
      }
    }

    return related;
  }

  /**
   * Get statistics
   */
  async getStats() {
    return {
      totalGroups: this.synonymGroups.size,
      totalSynonyms: this.expansionCache.size,
      groups: Array.from(this.synonymGroups.keys()),
    };
  }

  /**
   * Save to disk
   */
  async save() {
    try {
      const data = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        groups: Array.from(this.synonymGroups.values()),
      };
      fs.writeFileSync(this.indexPath, JSON.stringify(data, null, 2));
    } catch (err) {
      // Ignore
    }
  }

  /**
   * Load from disk
   */
  async load() {
    try {
      if (fs.existsSync(this.indexPath)) {
        const data = JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
        for (const group of data.groups || []) {
          this.synonymGroups.set(group.conceptId, group);
          for (const syn of group.synonyms) {
            this.expansionCache.set(syn.toLowerCase(), group.conceptId);
          }
        }
      }
    } catch (err) {
      // Ignore
    }
  }
}

module.exports = LegalSynonymEngine;
