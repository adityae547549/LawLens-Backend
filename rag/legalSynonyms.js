const LEGAL_SYNONYMS = {
  // Criminal Law & New Sanhitas Mappings
  'bail': ['anticipatory bail', 'regular bail', 'interim bail', 'section 437', 'section 438', 'section 439', 'section 482 bnss', 'section 483 bnss', 'bailable', 'non-bailable'],
  'anticipatory bail': ['section 438 crpc', 'section 482 bnss', 'pre-arrest bail', 'apprehending arrest'],
  'arrest': ['custodial interrogation', 'detention', 'remand', 'police custody', 'judicial custody', 'section 41 crpc', 'section 35 bnss', 'notice of appearance'],
  'fir': ['first information report', 'section 154 crpc', 'section 173 bnss', 'cognizable offence', 'zero fir', 'e-fir'],
  'murder': ['culpable homicide', 'section 300 ipc', 'section 302 ipc', 'section 101 bns', 'section 103 bns', 'mob lynching'],
  'theft': ['dishonest misappropriation', 'extortion', 'robbery', 'section 378 ipc', 'section 379 ipc', 'section 303 bns'],
  'cheating': ['fraud', 'section 415 ipc', 'section 420 ipc', 'section 318 bns', 'deceitful means'],
  'bns': ['bharatiya nyaya sanhita', 'ipc', 'indian penal code', 'bns 2023'],
  'bnss': ['bharatiya nagarik suraksha sanhita', 'crpc', 'code of criminal procedure', 'bnss 2023'],
  'bsa': ['bharatiya sakshya adhiniyam', 'evidence act', 'indian evidence act', 'bsa 2023'],
  'ipc': ['indian penal code', 'bns', 'bharatiya nyaya sanhita'],
  'crpc': ['code of criminal procedure', 'bnss', 'bharatiya nagarik suraksha sanhita'],

  // Constitutional Law & Rights
  'fundamental rights': ['part iii', 'article 12 to 35', 'article 14', 'article 19', 'article 21', 'constitutional remedies'],
  'article 21': ['right to life', 'personal liberty', 'due process', 'maneka gandhi', 'puttaswamy', 'privacy'],
  'article 19': ['freedom of speech', 'freedom of expression', 'assembly', 'association', 'movement', 'residence', 'trade'],
  'article 14': ['equality before law', 'equal protection of laws', 'non-arbitrariness'],
  'privacy': ['right to privacy', 'puttaswamy', 'article 21', 'data protection'],
  'emergency': ['article 352', 'article 356', 'adm jabalpur', 'sr bommai', 'president rule'],

  // Special Acts
  'rti': ['right to information', 'rti act 2005', 'cpio', 'cic', 'section 8 exemptions', 'public authority', '30 days limit'],
  'consumer': ['consumer protection act 2019', 'consumer rights', 'ccpa', 'district commission', 'state commission', 'national commission', 'ncdrc', 'product liability', 'deficiency of service'],
  'cyber': ['information technology act', 'it act 2000', 'section 66', 'section 66a', 'shreya singhal', 'section 69a blocking', 'section 79 safe harbour', 'hacking'],
  'contract': ['indian contract act 1872', 'agreement', 'section 10 valid contract', 'free consent', 'section 27 restraint of trade', 'section 73 breach damages', 'indemnity', 'guarantee'],
  'company': ['companies act 2013', 'section 135 csr', 'board of directors', 'section 166 director duties', 'nclt', 'oppression and mismanagement'],
  'gst': ['goods and services tax', 'cgst', 'sgst', 'igst', 'article 279a gst council', 'section 7 supply', 'section 16 input tax credit', 'itc'],
  'accident': ['motor vehicles act', 'mact', 'section 134 good samaritan', 'section 146 third party insurance', 'section 161 hit and run', 'section 185 drunk driving'],
  'environment': ['environment protection act 1986', 'section 5 epa closure', 'section 7 pollution', 'polluter pays principle', 'bhopal gas tragedy']
};

class LegalSynonyms {
  expandQuery(query) {
    if (!query) return query;
    const lower = query.toLowerCase();
    const expansions = new Set([query]);

    for (const [term, synonyms] of Object.entries(LEGAL_SYNONYMS)) {
      if (lower.includes(term)) {
        synonyms.forEach(syn => expansions.add(syn));
      }
    }

    return Array.from(expansions).join(' ');
  }
}

module.exports = new LegalSynonyms();
